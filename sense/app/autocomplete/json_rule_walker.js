define(['_', 'kb', 'exports'], function (_, kb, exports) {
  'use strict';

  var WALKER_MODE_EXPECTS_KEY = 1, WALKER_MODE_EXPECTS_CONTAINER = 2, WALKER_MODE_DONE = 3;

  function RuleWalker(initialRules, context, scopeRules) {
    // scopeRules are the rules used to resolve relative scope links
    if (typeof scopeRules == "undefined") {
      scopeRules = initialRules;
    }

    if ((initialRules || {}).__scope_link) {
      // normalize now
      initialRules = getLinkedRules(initialRules.__scope_link, scopeRules, context);
    }

    this._rules = initialRules;
    this._mode = WALKER_MODE_EXPECTS_CONTAINER;
    this._context = context;
    this.scopeRules = scopeRules;
  }

  function getRulesType(rules) {
    if (rules == null || typeof rules == undefined) {
      return "null";
    }
    if (rules.__any_of || rules instanceof Array) {
      return "list";
    }
    if (rules.__one_of) {
      return getRulesType(rules.__one_of[0]);
    }
    if (typeof rules == "object") {
      return "object";
    }
    return "value";
  }

  function getLinkedRules(link, currentRules, context) {
    if (_.isFunction(link)) {
      return link(context, currentRules)
    }

    var link_path = link.split(".");
    var scheme_id = link_path.shift();
    var linked_rules = currentRules;
    if (scheme_id == "GLOBAL") {
      linked_rules = kb.getGlobalAutocompleteRules();
    }
    else if (scheme_id) {
      linked_rules = kb.getEndpointDescriptionByEndpoint(scheme_id);
      if (!linked_rules) {
        throw "Failed to resolve linked scheme: " + scheme_id;
      }
      linked_rules = linked_rules.data_autocomplete_rules;
      if (!linked_rules) {
        throw "No autocomplete rules defined in linked scheme: " + scheme_id;
      }

    }

    var walker = new RuleWalker(linked_rules);
    var normalized_path = [];
    _.each(link_path, function (t) {
      normalized_path.push("{", t);
    }); // inject { before every step
    walker.walkTokenPath(normalized_path);
    var rules = walker.getRules();
    if (!rules) {
      throw "Failed to resolve rules by link: " + link;
    }
    return rules;
  }


  _.defaults(RuleWalker.prototype, {

    walkByToken: function (token) {
      var new_rules;
      if (this._mode == WALKER_MODE_EXPECTS_KEY) {
        if (token == "{" || token == "[") {
          this._rules = null;
          this._mode = WALKER_MODE_DONE;
          return null;
        }
        new_rules = this._rules[token] || this._rules["*"]
          || this._rules["$FIELD$"] || this._rules["$TYPE$"]; // we accept anything for a field.
        if (new_rules && new_rules.__scope_link) {
          new_rules = getLinkedRules(new_rules.__scope_link, this.scopeRules, this._context);
        }

        switch (getRulesType(new_rules)) {
          case "object":
          case "list":
            this._mode = WALKER_MODE_EXPECTS_CONTAINER;
            break;
          default:
            this._mode = WALKER_MODE_DONE;
        }

        this._rules = new_rules;
        return new_rules;
      }
      else if (this._mode == WALKER_MODE_EXPECTS_CONTAINER) {
        var rulesType = getRulesType(this._rules);

        if (token == "{") {
          if (rulesType != "object") {
            this._mode = WALKER_MODE_DONE;
            return this._rules = null;
          }
          this._mode = WALKER_MODE_EXPECTS_KEY;
          return this._rules;
        }
        else if (token == "[") {
          if (this._rules.__any_of) {
            new_rules = this._rules.__any_of;
          }
          else if (this._rules instanceof Array) {
            new_rules = this._rules;
          }
          else {
            this._mode = WALKER_MODE_DONE;
            return this._rules = null;
          }

          // for now we resolve using the first element in the array
          if (new_rules.length == 0) {
            this._mode = WALKER_MODE_DONE;
            return this._rules = null;
          }
          else {
            if (new_rules[0] && new_rules[0].__scope_link) {
              new_rules = [ getLinkedRules(new_rules[0].__scope_link, this.scopeRules) ];
            }
            switch (getRulesType(new_rules[0])) {
              case "object":
                this._mode = WALKER_MODE_EXPECTS_CONTAINER;
                new_rules = new_rules[0];
                break;
              case "list":
                this._mode = WALKER_MODE_EXPECTS_CONTAINER;
                new_rules = new_rules[0];
                break;
              default:
                this._mode = WALKER_MODE_EXPECTS_KEY;
            }
          }
          this._rules = new_rules;
          return this._rules;
        }
        else {
          this._rules = null;
          this._mode = WALKER_MODE_DONE;
          return null;
        }
      }
      else {
        this._rules = null;
        this._mode = WALKER_MODE_DONE;
        return null;
      }
    },

    walkTokenPath: function (tokenPath) {
      if (tokenPath.length == 0) {
        return;
      }
      tokenPath = _.clone(tokenPath);
      var t;
      do {
        t = tokenPath.shift();
      }
      while (this._rules && this.walkByToken(t) != null && tokenPath.length);
    },

    getRules: function () {
      return this._rules;
    },
    getNormalizedRules: function () {
      var rulesType = getRulesType(this._rules);
      if (this._mode == WALKER_MODE_EXPECTS_CONTAINER) {
        switch (rulesType) {
          case "object":
            return [ "{" ];
          case "list":
            return [ "[" ];
        }
      }
      return this._rules;
    }

  });

  exports.RuleWalker = RuleWalker;
  exports.getLinkedRules = getLinkedRules;
});