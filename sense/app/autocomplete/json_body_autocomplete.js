define([
  'exports',
  './json_rule_walker',
  'kb',
  'mappings',
  '_'
],
  function (exports, json_rule_walker, kb, mappings, _) {
    "use strict";

    function merge(a, b) {
      a.push.apply(a, b);
    }

    function addMetaToTermsList(list, meta, template) {
      return _.map(list, function (t) {
        if (typeof t !== "object") {
          t = { name: t};
        }
        return _.defaults(t, { meta: meta, template: template });
      });
    }

    function getRulesForPath(rules, tokenPath, scopeRules) {
      // scopeRules are the rules used to resolve relative scope links
      var walker = new json_rule_walker.RuleWalker(rules, scopeRules);
      walker.walkTokenPath(tokenPath);
      return walker.getNormalizedRules();

    }

    function expandTerm(term, context) {
      if (term == "$INDEX$") {
        return addMetaToTermsList(mappings.getIndices(), "index");
      }
      else if (term == "$TYPE$") {
        return addMetaToTermsList(mappings.getTypes(context.indices), "type");
      }
      else if (term == "$FIELD$") {
        return _.map(mappings.getFields(context.indices, context.types), function (f) {
          return { name: f.name, meta: f.type };
        });
      }
      return [ term ]
    }

    function addAutocompleteForPath(autocompleteSet, rules, tokenPath, context) {
      // extracts the relevant parts of rules for tokenPath
      var initialRules = rules;
      rules = getRulesForPath(rules, tokenPath);

      // apply rule set
      var term;
      if (rules) {
        if (typeof rules == "string") {
          merge(autocompleteSet, expandTerm(rules, context));
        }
        else if (rules instanceof Array) {
          if (rules.length > 0 && typeof rules[0] != "object") {// not an array of objects
            _.map(rules, function (t) {
              merge(autocompleteSet, expandTerm(t, context));
            });
          }
        }
        else if (rules.__one_of) {
          if (rules.__one_of.length > 0 && typeof rules.__one_of[0] != "object") {
            merge(autocompleteSet, rules.__one_of);
          }
        }
        else if (rules.__any_of) {
          if (rules.__any_of.length > 0 && typeof rules.__any_of[0] != "object") {
            merge(autocompleteSet, rules.__any_of);
          }
        }
        else if (typeof rules == "object") {
          for (term in rules) {

            if (typeof term == "string" && term.match(/^__|^\*$/)) {
              continue;
            } // meta term

            var rules_for_term = rules[term], template_for_term;

            // following linked scope until we find the right template
            while (typeof rules_for_term.__template == "undefined" &&
              typeof rules_for_term.__scope_link != "undefined"
              ) {
              rules_for_term = json_rule_walker.getLinkedRules(rules_for_term.__scope_link, initialRules);
            }

            if (typeof rules_for_term.__template != "undefined") {
              template_for_term = rules_for_term.__template;
            }
            else if (rules_for_term instanceof Array) {
              template_for_term = [];
              if (rules_for_term.length) {
                if (rules_for_term[0] instanceof  Array) {
                  template_for_term = [
                    []
                  ];
                }
                else if (typeof rules_for_term[0] == "object") {
                  template_for_term = [
                    {}
                  ];
                }
                else {
                  template_for_term = [rules_for_term[0]];
                }
              }
            }
            else if (_.isObject(rules_for_term)) {
              if (rules_for_term.__one_of) {
                template_for_term = rules_for_term.__one_of[0];
              }
              else if (_.isEmpty(rules_for_term))
              // term sub rules object. Check if has actual or just meta stuff (like __one_of
              {
                template_for_term = {};
              }
              else {
                for (var sub_rule in rules_for_term) {
                  if (!(typeof sub_rule == "string" && sub_rule.substring(0, 2) == "__")) {
                    // found a real sub element, it's an object.
                    template_for_term = {};
                    break;
                  }
                }
              }
            }
            else {
              // just add what ever the value is -> default
              template_for_term = rules_for_term;
            }

            switch (term) {
              case "$INDEX$":
                if (context.indices) {
                  merge(autocompleteSet,
                    addMetaToTermsList(context.indices, "index", template_for_term));
                }
                break;
              case "$TYPE$":
                merge(autocompleteSet,
                  addMetaToTermsList(mappings.getTypes(context.indices), "type", template_for_term));
                break;
              case "$FIELD$":
                /* jshint -W083 */
                merge(autocompleteSet,
                  _.map(mappings.getFields(context.indices, context.types), function (f) {
                    return { name: f.name, meta: f.type, template: template_for_term };
                  }));
                break;
              default:
                autocompleteSet.push({ name: term, template: template_for_term });
                break;
            }
          }
        }
        else {
          autocompleteSet.push(rules);
        }
      }

      return rules ? true : false;
    }


    exports.populateContext = function (tokenPath, context) {
      var autocompleteSet = [];

      tokenPath = _.clone(tokenPath);

      // apply global rules first, as they are of lower priority.
      // start with one before end as to not to resolve just "{" -> empty path
      for (var i = tokenPath.length - 2; i >= 0; i--) {
        var subPath = tokenPath.slice(i);
        if (addAutocompleteForPath(autocompleteSet, kb.getGlobalAutocompleteRules(), subPath, context)) {
          break;
        }
      }
      var pathAsString = tokenPath.join(",");
      addAutocompleteForPath(autocompleteSet, (context.endpoint || {}).data_autocomplete_rules,
        tokenPath, context);

      if (autocompleteSet) {
        _.uniq(autocompleteSet, false, function (t) {
          return t.name ? t.name : t
        });
      }

      console.log("Resolved token path " + pathAsString + " to ", autocompleteSet,
        " (endpoint: ", context.endpoint, ")"
      );
      context.autoCompleteSet = autocompleteSet;
      return context;

    }
  });