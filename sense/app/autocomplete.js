define([
  'history',
  'kb/index',
  'mappings',
  'ace',
  'jquery',
  'utils',
  '_',
  'jquery-ui'
], function (history, kb, mappings, ace, $, utils, _) {
  'use strict';

  var AceRange = ace.require('ace/range').Range;

  var LAST_EVALUATED_TOKEN = null;

  function Autocomplete(editor) {

    function getAutoCompleteValueFromToken(token) {
      switch ((token || {}).type) {
        case "variable":
        case "string":
        case "text":
        case "constant.numeric":
        case "constant.language.boolean":
          return token.value.replace(/"/g, '');
        case "method":
        case "url.index":
        case "url.type":
        case "url.part":
        case "url.endpoint":
          return token.value;
        default:
          // standing on white space, quotes or another punctuation - no replacing
          return "";
      }
    }

    function addMetaToTermsList(list, meta, template) {
      return _.map(list, function (t) {
        if (typeof t !== "object") {
          t = { name: t};
        }
        return _.defaults(t, { meta: meta, template: template });
      });
    }

    function termToFilterRegex(term, prefix, suffix) {
      if (!prefix) prefix = "";
      if (!suffix) suffix = "";

      return new RegExp(prefix + term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + suffix, 'i');
    }

    function applyTerm(term) {
      var session = editor.getSession();

      var context = term.context;

      // make sure we get up to date replacement info.
      addReplacementInfoToContext(context, editor.getCursorPosition(), term.value);

      var termAsString;
      if (context.autoCompleteType == "body") {
        termAsString = typeof term.value == "string" ? '"' + term.value + '"' : term.value + "";
        if (term.value === "[" || term.value === "{") termAsString = "";
      }
      else {
        termAsString = term.value + "";
      }

      var valueToInsert = termAsString;
      var templateInserted = false;
      if (context.addTemplate && typeof term.template != "undefined") {
        var indentedTemplateLines = utils.jsonToString(term.template, true).split("\n");
        var currentIndentation = session.getLine(context.rangeToReplace.start.row);
        currentIndentation = currentIndentation.match(/^\s*/)[0];
        for (var i = 1; i < indentedTemplateLines.length; i++) // skip first line
          indentedTemplateLines[i] = currentIndentation + indentedTemplateLines[i];

        valueToInsert += ": " + indentedTemplateLines.join("\n");
        templateInserted = true;
      } else {
        templateInserted = true;
        if (term.value === "[") valueToInsert += "[]";
        else if (term.value == "{") valueToInsert += "{}";
        else {
          templateInserted = false;
        }
      }

      valueToInsert = context.prefixToAdd + valueToInsert + context.suffixToAdd;

      // disable listening to the changes we are making.
      removeChangeListener();

      if (context.rangeToReplace.start.column != context.rangeToReplace.end.column)
        session.replace(context.rangeToReplace, valueToInsert);
      else
        editor.insert(valueToInsert);

      editor.clearSelection(); // for some reason the above changes selection

      // go back to see whether we have one of ( : { & [ do not require a comma. All the rest do.
      var newPos = {
        row: context.rangeToReplace.start.row,
        column: context.rangeToReplace.start.column + termAsString.length + context.prefixToAdd.length
          + (templateInserted ? 0 : context.suffixToAdd.length)
      };

      var tokenIter = editor.iterForPosition(newPos.row, newPos.column);

      // look for the next place stand, just after a comma, {
      var nonEmptyToken = editor.parser.nextNonEmptyToken(tokenIter);
      switch (nonEmptyToken ? nonEmptyToken.type : "NOTOKEN") {
        case "paren.rparen":
          newPos = { row: tokenIter.getCurrentTokenRow(), column: tokenIter.getCurrentTokenColumn() };
          break;
        case "punctuation.colon":
          nonEmptyToken = editor.parser.nextNonEmptyToken(tokenIter);
          if ((nonEmptyToken || {}).type == "paren.lparen") {
            nonEmptyToken = editor.parser.nextNonEmptyToken(tokenIter);
            newPos = { row: tokenIter.getCurrentTokenRow(), column: tokenIter.getCurrentTokenColumn() };
            if (nonEmptyToken && nonEmptyToken.value.indexOf('"') === 0) newPos.column++; // don't stand on "
          }
          break;
        case "paren.lparen":
        case "punctuation.comma":
          tokenIter.stepForward();
          newPos = { row: tokenIter.getCurrentTokenRow(), column: tokenIter.getCurrentTokenColumn() };
          break;
      }


      editor.moveCursorToPosition(newPos);

      // re-enable listening to typing
      addChangeListener();
    }

    function getAutoCompleteContext(editor, session, pos) {
      // deduces all the parameters need to position and insert the auto complete
      var context = {
        autoCompleteSet: null, // instructions for what can be here
        endpoint: null,
        urlPath: null,
        method: null,
        activeScheme: null
      };

//      context.updatedForToken = session.getTokenAt(pos.row, pos.column);
//
//      if (!context.updatedForToken)
//        context.updatedForToken = { value: "", start: pos.column }; // empty line
//
//      context.updatedForToken.row = pos.row; // extend

      context.autoCompleteType = getAutoCompleteType(pos);
      switch (context.autoCompleteType) {
        case "type":
          addTypeAutoCompleteSetToContext(context, pos);
          break;
        case "index":
          addIndexAutoCompleteSetToContext(context, pos);
          break;
        case "endpoint":
          addEndpointAutoCompleteSetToContext(context, pos);
          break;
        case "method":
          addMethodAutoCompleteSetToContext(context, pos);
          break;
        case "body":
          addBodyAutoCompleteSetToContext(context, pos);
          break;
        default:
          return null;
      }


      if (!context.autoCompleteSet) {
        return null; // nothing to do..
      }

      addReplacementInfoToContext(context, pos);

      return context;
    }

    function getAutoCompleteType(pos) {
      // return "method", "index", "type" ,"id" or "body" to determine auto complete type.
      var tokenIter = editor.iterForPosition(pos.row, pos.column);
      var startRow = tokenIter.getCurrentTokenRow();
      var t = tokenIter.getCurrentToken();

      function checkIfStandingAfterBody() {
        if (!t) return "method"; // there is really nothing
        if (t.type != "paren.rparen") return "body"; // if we don't encounter a } where are not after the body
        // too bad , have to count parentheses..
        var openParam = 1;
        while (openParam > 0 && (t = editor.parser.prevNonEmptyToken(tokenIter)) && !editor.parser.isUrlOrMethodToken(t)) {
          if (t.type == "paren.rparen") openParam++;
          else if (t.type == "paren.lparen") openParam--;
        }
        if (openParam > 0) return "body"; // parens didn't match up. We are in body land.

        // what do we have before if it is the url -> we skipped the whole body
        t = editor.parser.prevNonEmptyToken(tokenIter);
        if (t && editor.parser.isUrlOrMethodToken(t)) return "method";

        return "body"; // we are halfway the body somewhere...
      }

      // where are standing on an empty line, just check if we are starting a new request
      if (!t) {
        t = editor.parser.prevNonEmptyToken(tokenIter);
        return checkIfStandingAfterBody();
      }


      if (t.type == "url.comma") t = tokenIter.stepBackward();

      switch (t.type) {
        case "comment":
          return null;
        case "url.type":
          return "type";
        case "url.index":
          return "index";
        case "url.id":
          return "id";
        case "url.part":
        case "url.endpoint":
          return "endpoint";
        case "method":
          return "method";
        case "url.slash":
          t = tokenIter.stepBackward();
          switch ((t || {}).type) {
            case "url.type":
              return "id";
            case "url.index":
              return "type";
            case "url.endpoint":
            case "url.part":
              return "endpoint";
            case "whitespace":
              return "index";
            default:
              return null;
          }
        /* falls through */
        default:
          if (t.type.indexOf("url") === 0) return null;

          // check if we are beyond the body and should start a new request
          // but only we have a new line between current pos and the body.
          t = editor.parser.prevNonEmptyToken(tokenIter);
          if (t && tokenIter.getCurrentTokenRow() < startRow) {
            return checkIfStandingAfterBody();
          }

          return "body";
      }
    }

    function addReplacementInfoToContext(context, pos, replacingTerm) {
      // extract the initial value, rangeToReplace & textBoxPosition

      // Scenarios for current token:
      //   -  Nice token { "bla|"
      //   -  Broken text token {   bla|
      //   -  No token : { |
      //   - Broken scenario { , bla|
      //   - Nice token, broken before: {, "bla"

      var session = editor.getSession();
      var insertingRelativeToToken;

      context.updatedForToken = session.getTokenAt(pos.row, pos.column);
      if (!context.updatedForToken)
        context.updatedForToken = { value: "", start: pos.column }; // empty line


      switch (context.updatedForToken.type) {
        case "variable":
        case "string":
        case "text":
        case "constant.numeric":
        case "constant.language.boolean":
        case "method":
        case "url.index":
        case "url.type":
        case "url.id":
        case "url.method":
        case "url.endpoint":
        case "url.part":
          insertingRelativeToToken = 0;
          context.rangeToReplace = new AceRange(
            pos.row, context.updatedForToken.start, pos.row,
            context.updatedForToken.start + context.updatedForToken.value.length
          );
          context.replacingToken = true;
          break;
        default:
          if (replacingTerm && context.updatedForToken.value == replacingTerm) {
            insertingRelativeToToken = 0;
            context.rangeToReplace = new AceRange(
              pos.row, context.updatedForToken.start, pos.row,
              context.updatedForToken.start + context.updatedForToken.value.length
            );
            context.replacingToken = true;
          }
          else {
            // standing on white space, quotes or another punctuation - no replacing
            context.rangeToReplace = new AceRange(
              pos.row, pos.column, pos.row, pos.column
            );
            context.replacingToken = false;
          }
          break;
      }

      context.textBoxPosition = { row: context.rangeToReplace.start.row, column: context.rangeToReplace.start.column};

      switch (context.autoCompleteType) {
        case "type":
          addTypePrefixSuffixToContext(context);
          break;
        case "index":
          addIndexPrefixSuffixToContext(context);
          break;
        case "endpoint":
          addEndpointPrefixSuffixToContext(context);
          break;
        case "method":
          addMethodPrefixSuffixToContext(context);
          break;
        case "body":
          addBodyPrefixSuffixToContext(context);
          break;
      }
    }

    function addBodyPrefixSuffixToContext(context) {
      // Figure out what happens next to the token to see whether it needs trailing commas etc.

      // Templates will be used if not destroying existing structure.
      // -> token : {} or token ]/} or token , but not token : SOMETHING ELSE

      context.prefixToAdd = "";
      context.suffixToAdd = "";

      var tokenIter = editor.iterForCurrentLoc();
      var nonEmptyToken = editor.parser.nextNonEmptyToken(tokenIter);
      switch (nonEmptyToken ? nonEmptyToken.type : "NOTOKEN") {
        case "NOTOKEN":
        case "paren.lparen":
        case "paren.rparen":
        case "punctuation.comma":
          context.addTemplate = true;
          break;
        case "punctuation.colon":
          // test if there is an empty object - if so we replace it
          context.addTemplate = false;

          nonEmptyToken = editor.parser.nextNonEmptyToken(tokenIter);
          if (!(nonEmptyToken && nonEmptyToken.value == "{")) break;
          nonEmptyToken = editor.parser.nextNonEmptyToken(tokenIter);
          if (!(nonEmptyToken && nonEmptyToken.value == "}")) break;
          context.addTemplate = true;
          // extend range to replace to include all up to token
          context.rangeToReplace.end.row = tokenIter.getCurrentTokenRow();
          context.rangeToReplace.end.column = tokenIter.getCurrentTokenColumn() + nonEmptyToken.value.length;

          // move one more time to check if we need a trailing comma
          nonEmptyToken = editor.parser.nextNonEmptyToken(tokenIter);
          switch (nonEmptyToken ? nonEmptyToken.type : "NOTOKEN") {
            case "NOTOKEN":
            case "paren.rparen":
            case "punctuation.comma":
            case "punctuation.colon":
              break;
            default:
              context.suffixToAdd = ", "
          }

          break;
        default:
          context.addTemplate = true;
          context.suffixToAdd = ", ";
          break; // for now play safe and do nothing. May be made smarter.
      }


      // go back to see whether we have one of ( : { & [ do not require a comma. All the rest do.
      tokenIter = editor.iterForCurrentLoc();
      nonEmptyToken = tokenIter.getCurrentToken();
      var insertingRelativeToToken; // -1 is before token, 0 middle, +1 after token
      if (context.replacingToken) {
        insertingRelativeToToken = 0;
      }
      else {
        var pos = editor.getCursorPosition();
        if (pos.column == context.updatedForToken.start)
          insertingRelativeToToken = -1;
        else if (pos.column < context.updatedForToken.start + context.updatedForToken.value.length)
          insertingRelativeToToken = 0;
        else
          insertingRelativeToToken = 1;

      }
      // we should actually look at what's happening before this token
      if (editor.parser.isEmptyToken(nonEmptyToken) || insertingRelativeToToken <= 0) {
        nonEmptyToken = editor.parser.prevNonEmptyToken(tokenIter);
      }


      switch (nonEmptyToken ? nonEmptyToken.type : "NOTOKEN") {
        case "NOTOKEN":
        case "paren.lparen":
        case "punctuation.comma":
        case "punctuation.colon":
        case "method":
          break;
        default:
          if (nonEmptyToken && nonEmptyToken.type.indexOf("url") < 0)
            context.prefixToAdd = ", "
      }

      return context;
    }

    function addMethodPrefixSuffixToContext(context) {
      context.prefixToAdd = "";
      context.suffixToAdd = "";
      var tokenIter = editor.iterForCurrentLoc();
      var row = tokenIter.getCurrentTokenRow();
      var t = editor.parser.nextNonEmptyToken(tokenIter);

      if (tokenIter.getCurrentTokenRow() != row || !t) {
        // we still have nothing next to the method, add a space..
        context.suffixToAdd = " ";
      }
    }

    function addTypePrefixSuffixToContext(context) {
      context.prefixToAdd = "";
      context.suffixToAdd = "";
    }

    function addIndexPrefixSuffixToContext(context) {
      context.prefixToAdd = "";
      context.suffixToAdd = "";
    }

    function addEndpointPrefixSuffixToContext(context) {
      context.prefixToAdd = "";
      context.suffixToAdd = "";
    }

    function addMethodAutoCompleteSetToContext(context, pos) {
      context.autoCompleteSet = _.map([ "GET", "PUT", "POST", "DELETE", "HEAD" ], function (m, i) {
        return { name: m, score: -i, meta: "method"}
      })
    }

    function addEndpointAutoCompleteSetToContext(context, pos) {
      var completionTerms = [];
      var methodAndIndices = getCurrentMethodEndpointAndTokenPath(pos);
      completionTerms.push.apply(completionTerms, kb.getEndpointAutocomplete(methodAndIndices.indices,
        methodAndIndices.types, methodAndIndices.id));

      if (methodAndIndices.endpoint) {
        // we already have a part, zoom in
        var filter = termToFilterRegex(methodAndIndices.endpoint + "/", "^");
        var filtered = [];
        _.each(completionTerms, function (term) {
          if ((term + "").match(filter))
            filtered.push(term.substring(methodAndIndices.endpoint.length + 1));
        });
        completionTerms = filtered;
      }


      context.autoCompleteSet = addMetaToTermsList(completionTerms, "endpoint");
    }

    function addTypeAutoCompleteSetToContext(context, pos) {
      var iterToken = editor.iterForPosition(pos.row, pos.column);
      var addEndpoints = false;
      var t = iterToken.getCurrentToken();
      if (t && (t.type == "whitespace" || t.type == "url.slash")) {
        addEndpoints = true;
      }
      else {
        t = iterToken.stepBackward();
        if (t && (t.type == "whitespace" || t.type == "url.slash")) {
          addEndpoints = true;
        }
      }
      var methodAndIndices = getCurrentMethodEndpointAndTokenPath(pos);
      var completionTerms = mappings.getTypes(methodAndIndices.indices) || [];
      completionTerms = addMetaToTermsList(completionTerms, "type");
      if (addEndpoints) {
        completionTerms.push.apply(completionTerms,
          addMetaToTermsList(kb.getEndpointAutocomplete(methodAndIndices.indices,
            methodAndIndices.types, methodAndIndices.id),
            "endpoint"
          ));
      }

      context.autoCompleteSet = completionTerms;
    }

    function addIndexAutoCompleteSetToContext(context, pos) {
      var iterToken = editor.iterForPosition(pos.row, pos.column);
      var addEndpoints = false;
      var t = iterToken.getCurrentToken();
      if (t && (t.type == "whitespace" || t.type == "url.slash")) {
        addEndpoints = true;
      }
      else {
        t = iterToken.stepBackward();
        if (t && (t.type == "whitespace" || t.type == "url.slash")) {
          addEndpoints = true;
        }
      }
      var completionTerms = mappings.getIndices(true) || [];
      completionTerms = addMetaToTermsList(completionTerms, "index");
      if (addEndpoints) {
        var methodAndIndices = getCurrentMethodEndpointAndTokenPath(pos);
        completionTerms.push.apply(completionTerms,
          addMetaToTermsList(kb.getEndpointAutocomplete(methodAndIndices.indices,
            methodAndIndices.types, methodAndIndices.id),
            "endpoint"
          ));
      }

      context.autoCompleteSet = completionTerms;
    }

    function addBodyAutoCompleteSetToContext(context, pos) {
      var autocompleteSet = [];

      function RuleWalker(initialRules, scopeRules) {
        // scopeRules are the rules used to resolve relative scope links
        if (typeof scopeRules == "undefined") scopeRules = initialRules;
        var WALKER_MODE_EXPECTS_KEY = 1, WALKER_MODE_EXPECTS_CONTAINER = 2, WALKER_MODE_DONE = 3;

        function getRulesType(rules) {
          if (rules == null || typeof rules == undefined) return "null";
          if (rules.__any_of || rules instanceof Array) return "list";
          if (rules.__one_of) return getRulesType(rules.__one_of[0]);
          if (typeof rules == "object") return "object";
          return "value";
        }

        var walker = {
          _rules: initialRules,
          _mode: WALKER_MODE_EXPECTS_CONTAINER,

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
                new_rules = getLinkedRules(new_rules.__scope_link, scopeRules);
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
            } else if (this._mode == WALKER_MODE_EXPECTS_CONTAINER) {
              var rulesType = getRulesType(this._rules);

              if (token == "{") {
                if (rulesType != "object") {
                  this._mode = WALKER_MODE_DONE;
                  return this._rules = null;
                }
                this._mode = WALKER_MODE_EXPECTS_KEY;
                return this._rules;
              } else if (token == "[") {
                if (this._rules.__any_of) {
                  new_rules = this._rules.__any_of;
                } else if (this._rules instanceof Array) {
                  new_rules = this._rules;
                } else {
                  this._mode = WALKER_MODE_DONE;
                  return this._rules = null;
                }

                // for now we resolve using the first element in the array
                if (new_rules.length == 0) {
                  this._mode = WALKER_MODE_DONE;
                  return this._rules = null;
                } else {
                  if (new_rules[0] && new_rules[0].__scope_link) {
                    new_rules = [ getLinkedRules(new_rules[0].__scope_link, scopeRules) ];
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
            if (tokenPath.length == 0) return;
            tokenPath = $.merge([], tokenPath);
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
        };
        return walker;
      }

      function getLinkedRules(link, currentRules) {
        var link_path = link.split(".");
        var scheme_id = link_path.shift();
        var linked_rules = currentRules;
        if (scheme_id == "GLOBAL") {
          linked_rules = kb.getGlobalAutocompleteRules();
        }
        else if (scheme_id) {
          linked_rules = kb.getEndpointDescriptionByEndpoint(scheme_id);
          if (!linked_rules)
            throw "Failed to resolve linked scheme: " + scheme_id;
          linked_rules = linked_rules.data_autocomplete_rules;
          if (!linked_rules)
            throw "No autocomplete rules defined in linked scheme: " + scheme_id;

        }

        var walker = new RuleWalker(linked_rules);
        var normalized_path = $.map(link_path, function (t) {
          return [ "{", t];
        }); // inject { before every step
        walker.walkTokenPath(normalized_path);
        var rules = walker.getRules();
        if (!rules) throw "Failed to resolve rules by link: " + link;
        return rules;
      }

      function getRulesForPath(rules, tokenPath, scopeRules) {
        // scopeRules are the rules used to resolve relative scope links
        var walker = new RuleWalker(rules, scopeRules);
        walker.walkTokenPath(tokenPath);
        return walker.getNormalizedRules();


        tokenPath = $.merge([], tokenPath);
        if (!rules)
          return null;

        if (typeof scopeRules == "undefined") scopeRules = rules;
        var t;
        // find the right rule set for current path
        while (tokenPath.length && rules) {
          t = tokenPath.shift();
          switch (t) {
            case "{":
              if (typeof rules != "object") rules = null;
              break;
            case "[":
              if (rules.__any_of || rules instanceof Array) {
                var norm_rules = rules.__any_of || rules;
                if (tokenPath.length) {
                  // we need to go on, try
                  for (var i = 0; i < norm_rules.length; i++) {
                    var possible_rules = getRulesForPath(norm_rules[i], tokenPath, scopeRules);
                    if (possible_rules) return possible_rules;
                  }
                }
                else
                  rules = norm_rules;
              }
              else
                rules = null;
              break;
            default:
              rules = rules[t] || rules["*"] || rules["$FIELD$"] || rules["$TYPE$"]; // we accept anything for a field.
          }
          if (rules && typeof rules.__scope_link != "undefined") {
            rules = getLinkedRules(rules.__scope_link, scopeRules);
          }
        }
        if (tokenPath.length) return null; // didn't find anything.
        return rules;
      }

      function expandTerm(term, activeScheme) {
        if (term == "$INDEX$") {
          return addMetaToTermsList(mappings.getIndices(), "index");
        }
        else if (term == "$TYPE$") {
          return addMetaToTermsList(mappings.getTypes(activeScheme.indices), "type");
        }
        else if (term == "$FIELD$") {
          return _.map(mappings.getFields(activeScheme.indices, activeScheme.types), function (f) {
            return { name: f.name, meta: f.type };
          });
        }
        return [ term ]
      }

      function extractOptionsForPath(rules, tokenPath, activeScheme) {
        // extracts the relevant parts of rules for tokenPath
        var initialRules = rules;
        rules = getRulesForPath(rules, tokenPath);

        // apply rule set
        var term;
        if (rules) {
          if (typeof rules == "string") {
            $.merge(autocompleteSet, expandTerm(rules, activeScheme));
          }
          else if (rules instanceof Array) {
            if (rules.length > 0 && typeof rules[0] != "object") {// not an array of objects
              $.map(rules, function (t) {
                $.merge(autocompleteSet, expandTerm(t, activeScheme));
              });
            }
          }
          else if (rules.__one_of) {
            if (rules.__one_of.length > 0 && typeof rules.__one_of[0] != "object")
              $.merge(autocompleteSet, rules.__one_of);
          }
          else if (rules.__any_of) {
            if (rules.__any_of.length > 0 && typeof rules.__any_of[0] != "object")
              $.merge(autocompleteSet, rules.__any_of);
          }
          else if (typeof rules == "object") {
            for (term in rules) {

              if (typeof term == "string" && term.match(/^__|^\*$/))
                continue; // meta term

              var rules_for_term = rules[term], template_for_term;

              // following linked scope until we find the right template
              while (typeof rules_for_term.__template == "undefined" &&
                typeof rules_for_term.__scope_link != "undefined"
                ) {
                rules_for_term = getLinkedRules(rules_for_term.__scope_link, initialRules);
              }

              if (typeof rules_for_term.__template != "undefined")
                template_for_term = rules_for_term.__template;
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
              } else if (typeof rules_for_term == "object") {
                if (rules_for_term.__one_of)
                  template_for_term = rules_for_term.__one_of[0];
                else if ($.isEmptyObject(rules_for_term))
                // term sub rules object. Check if has actual or just meta stuff (like __one_of
                  template_for_term = {};
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
                  if (activeScheme.indices)
                    $.merge(autocompleteSet,
                      addMetaToTermsList(activeScheme.indices, "index", template_for_term));
                  break;
                case "$TYPE$":
                  $.merge(autocompleteSet,
                    addMetaToTermsList(mappings.getTypes(activeScheme.indices), "type", template_for_term));
                  break;
                case "$FIELD$":
                  /* jshint -W083 */
                  $.merge(autocompleteSet,
                    _.map(mappings.getFields(activeScheme.indices, activeScheme.types), function (f) {
                      return { name: f.name, meta: f.type, template: template_for_term };
                    }));
                  break;
                default:
                  autocompleteSet.push({ name: term, template: template_for_term });
                  break;
              }
            }
          }
          else autocompleteSet.push(rules);
        }

        return rules ? true : false;
      }

      var ret = getCurrentMethodEndpointAndTokenPath(pos);
      context.method = ret.method;
      context.endpoint = ret.endpoint;
      context.urlPath = ret.urlPath;
      context.activeScheme = {
        indices: ret.indices,
        types: ret.types,
        id: ret.id,
        scheme: kb.getEndpointDescriptionByPath(ret.endpoint, ret.indices, ret.types, ret.id)
      };
      var tokenPath = ret.tokenPath;
      if (!tokenPath) { // zero length tokenPath is true

        console.log("Can't extract a valid token path.");
        return context;
      }


      // apply global rules first, as they are of lower priority.
      // start with one before end as to not to resolve just "{" -> empty path
      for (var i = ret.tokenPath.length - 2; i >= 0; i--) {
        var subPath = tokenPath.slice(i);
        if (extractOptionsForPath(kb.getGlobalAutocompleteRules(), subPath, context.activeScheme)) break;
      }
      var pathAsString = tokenPath.join(",");
      extractOptionsForPath((context.activeScheme.scheme || {}).data_autocomplete_rules, tokenPath, context.activeScheme);

      if (autocompleteSet) {
        _.uniq(autocompleteSet, false, function (t) {
          return t.name ? t.name : t
        });
      }


      console.log("Resolved token path " + pathAsString + " to ", autocompleteSet,
        " (endpoint: " + context.endpoint + " scheme: " + (context.activeScheme.scheme || {})._id + " )"
      );
      context.autoCompleteSet = autocompleteSet;
      return context;
    }

    function getCurrentMethodEndpointAndTokenPath(pos) {
      var tokenIter = editor.iterForPosition(pos.row, pos.column);
      var startPos = pos;
      var tokenPath = [], last_var = "", first_scope = true;

      var STATES = { looking_for_key: 0, // looking for a key but without jumping over anything but white space and colon.
        looking_for_scope_start: 1, // skip everything until scope start
        start: 3};
      var state = STATES.start;

      // initialization problems -
      var t = tokenIter.getCurrentToken();
      if (t) {
        if (startPos.column == 0) {
          // if we are at the beginning of the line, the current token is the one after cursor, not before which
          // deviates from the standard.
          t = tokenIter.stepBackward();
          state = STATES.looking_for_scope_start;
        }

      }
      else {
        if (startPos.column == 0) {
          // empty lines do no have tokens, move one back
          t = tokenIter.stepBackward();
          state = STATES.start;
        }

      }

      var walkedSomeBody = false;

      // climb one scope at a time and get the scope key
      for (; t && t.type.indexOf("url") == -1 && t.type != "method"; t = tokenIter.stepBackward()) {

        if (t.type != "whitespace") walkedSomeBody = true; // marks we saw something

        switch (t.type) {
          case "variable":
            if (state == STATES.looking_for_key)
              tokenPath.unshift(t.value.trim().replace(/"/g, ''));
            state = STATES.looking_for_scope_start; // skip everything until the beginning of this scope
            break;


          case "paren.lparen":
            tokenPath.unshift(t.value);
            if (state == STATES.looking_for_scope_start) {
              // found it. go look for the relevant key
              state = STATES.looking_for_key;
            }
            break;
          case "paren.rparen":
            // reset he search for key
            state = STATES.looking_for_scope_start;
            // and ignore this sub scope..
            var parenCount = 1;
            t = tokenIter.stepBackward();
            while (t && parenCount > 0) {
              switch (t.type) {
                case "paren.lparen":
                  parenCount--;
                  break;
                case "paren.rparen":
                  parenCount++;
                  break;
              }
              if (parenCount > 0) t = tokenIter.stepBackward();
            }
            if (!t) // oops we run out.. we don't know what's up return null;
              return {};
            continue;
          case "string":
          case "constant.numeric" :
          case "text":
            if (state == STATES.start) {
              state = STATES.looking_for_key;
            }
            else if (state == STATES.looking_for_key) {
              state = STATES.looking_for_scope_start;
            }

            break;
          case "punctuation.comma":
            if (state == STATES.start) {
              state = STATES.looking_for_scope_start;
            }
            break;
          case "punctuation.colon":
          case "whitespace":
            if (state == STATES.start) {
              state = STATES.looking_for_key;
            }
            break; // skip white space

        }
      }

      if (walkedSomeBody && (!tokenPath || tokenPath.length == 0)) {
        // we had some content and still no path -> the cursor is position after a closed body -> no auto complete
        return {};
      }
      if (tokenIter.getCurrentTokenRow() == startPos.row) {
        // we are on the same line as cursor and dealing with url on. Current token is not part of the context
        t = tokenIter.stepBackward();
      }

      var ret = {
        tokenPath: tokenPath,
        endpoint: null,
        urlPath: "",
        indices: [],
        types: [],
        id: null
      };
      while (t && t.type.indexOf("url") != -1) {
        switch (t.type) {
          case "url.index":
            ret.indices.push(t.value);
            ret.urlPath = t.value + ret.urlPath;
            break;
          case "url.type":
            ret.types.push(t.value);
            ret.urlPath = t.value + ret.urlPath;
            break;
          case "url.endpoint":
          case "url.part":
            if (ret.endpoint)
              ret.endpoint = "/" + ret.endpoint;
            else
              ret.endpoint = "";

            ret.endpoint = t.value + ret.endpoint;
            ret.urlPath = t.value + ret.urlPath;
            break;
          case "url.id":
            ret.id = t.value;
            ret.urlPath = t.value + ret.urlPath;
            break;
          case "url.host":
          case "url.scheme":
            break; // ignore
          default:
            ret.urlPath = t.value + ret.urlPath;
            break;
        }
        t = editor.parser.prevNonEmptyToken(tokenIter);
      }

      if (t && t.type == "method") {
        ret.method = t.value;
      }


      return ret;
    }


    var evaluateCurrentTokenAfterAChange = _.debounce(function evaluateCurrentTokenAfterAChange(pos) {
      var session = editor.getSession();
      var currentToken = session.getTokenAt(pos.row, pos.column);
      console.log("Evaluating current token: " + (currentToken || {}).value +
        " last examined: " + (LAST_EVALUATED_TOKEN || {}).value);

      if (!currentToken) {
        if (pos.row == 0) {
          LAST_EVALUATED_TOKEN = null;
          return;
        }
        currentToken = { start: 0, value: ""}; // empty row
      }

      currentToken.row = pos.row; // extend token with row. Ace doesn't supply it by default
      if (editor.parser.isEmptyToken(currentToken)) {
        // empty token. check what's coming next
        var nextToken = session.getTokenAt(pos.row, pos.column+1);
        if (editor.parser.isEmptyToken(nextToken)) {
          // Empty line, or we're not on the edge of current token. Save the current position as base
          currentToken.start = pos.column;
          LAST_EVALUATED_TOKEN = currentToken;
        } else {
          nextToken.row = pos.row;
          LAST_EVALUATED_TOKEN = nextToken;
        }
        return;
      }


      if (!LAST_EVALUATED_TOKEN) {
        LAST_EVALUATED_TOKEN = currentToken;
        return; // wait for the next typing.
      }

      if (LAST_EVALUATED_TOKEN.start != currentToken.start || LAST_EVALUATED_TOKEN.row != currentToken.row
          || LAST_EVALUATED_TOKEN.value === currentToken.value) {
        // not on the same place or nothing changed, cache and wait for the next time
        LAST_EVALUATED_TOKEN = currentToken;
        return;
      }

      // don't automatically open the auto complete if some just hit enter (new line) or open a parentheses
      switch (currentToken.type || "UNKNOWN") {
        case "paren.lparen":
        case "paren.rparen":
        case "punctuation.colon":
        case "punctuation.comma":
        case "UNKOWN":
          return;
      }

      LAST_EVALUATED_TOKEN = currentToken;
      editor.execCommand("startAutocomplete");
    }, 100);

    function editorChangeListener(e) {
      var cursor = editor.selection.lead;
      if (editor.__ace.completer && editor.__ace.completer.activated) {
        return;
      }
      evaluateCurrentTokenAfterAChange(cursor);
    }

    function addChangeListener() {
      editor.on("changeSelection", editorChangeListener);
    }

    function removeChangeListener() {
      editor.off("changeSelection", editorChangeListener)
    }


    function getCompletions(editor, session, pos, prefix, callback) {
      // this is hacky, but there is at the moment no settings/way to do it differently
      editor.completer.autoInsert = false;

      var context = getAutoCompleteContext(editor, session, pos);
      if (!context) {
        callback(null, []);
      } else {
        var terms = _.map(context.autoCompleteSet, function (term) {
          if (typeof term !== "object") {
            term = {
              name: term
            }
          }

          return _.defaults(term, {
            value: term.name,
            meta: "API",
            score: 0,
            context: context,
            completer: {
              insertMatch: function () {
                applyTerm(term);
              }
            }
          });
        });

        terms.sort(function (t1, t2) {
          /* score sorts from high to low */
          if (t1.score > t2.score) {
            return -1;
          }
          if (t1.score < t2.score) {
            return 1;
          }
          /* names sort from low to high */
          if (t1.name < t2.name) {
            return -1;
          }
          if (t1.name === t2.name) {
            return 0;
          }
          return 1;
        });

        callback(null, _.map(terms, function (t, i) {
          t.score = -i;
          return t;
        }));
      }
    }

    addChangeListener();

    return {
      completer: {
        getCompletions: getCompletions
      },
      _test: {
        addReplacementInfoToContext: addReplacementInfoToContext,
        addChangeListener: addChangeListener,
        removeChangeListener: removeChangeListener
      }
    }
  }

  return Autocomplete;
});
