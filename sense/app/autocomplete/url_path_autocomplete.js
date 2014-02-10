define([
  'exports',
  '_'
],
  function (exports, _) {
    "use strict";

    exports.AutocompleteComponent = function (name) {
      this.name = name;
    };

    exports.Matcher = function (name, next) {
      this.name = name;
      this.next = next;
    };

    exports.AutocompleteComponent.prototype.getTerms = function (context, editor) {
      return [];
    };

    /*
     if the current matcher matches this term, this method should return an object with the following keys
     {
     context_values: {
     values extract from term that should be added to the context
     }
     next: AutocompleteComponent(s) to use next
     priority: optional priority to solve collisions between multiple paths. Min value is used across entire chain
     }
     */
    exports.AutocompleteComponent.prototype.match = function (token, context, editor) {
      var r = {};
      r[this.name] = token;
      return {
        next: this.next
      };
    };

    function passThroughContext(context, extensionList) {
      function PTC() {

      }

      PTC.prototype = context;
      var r = new PTC();
      if (extensionList) {
        extensionList.unshift(r);
        _.assign.apply(_, extensionList);
        extensionList.shift();
      }
      return r;
    }

    function WalkingState(parent_name, components, contextExtensionList, depth, priority) {
      this.parent_name = parent_name;
      this.components = components;
      this.contextExtensionList = contextExtensionList;
      this.depth = depth || 0;
      this.priority = priority;
    }


    function walkTokenPath(tokenPath, walkingStates, context, editor) {
      if (!tokenPath || tokenPath.length === 0) {
        return  walkingStates
      }
      var token = tokenPath[0],
        nextWalkingStates = [];

      _.each(walkingStates, function (ws) {
        var contextForState = passThroughContext(context, ws.contextExtensionList);
        _.each(ws.components, function (component) {
          var result = component.match(token, contextForState, editor);
          if (result && !_.isEmpty(result)) {
            var next, extensionList;
            if (result.next && !_.isArray(result.next)) {
              next = [result.next];
            }
            else {
              next = result.next;
            }
            if (result.context_values) {
              extensionList = [];
              [].push.apply(extensionList, ws.contextExtensionList);
              extensionList.push(result.context_values);
            }
            else {
              extensionList = ws.contextExtensionList;
            }

            var priority = ws.priority;
            if (_.isNumber(result.priority)) {
              if (_.isNumber(priority)) {
                priority = Math.min(priority, result.priority);
              }
              else {
                priority = result.priority;
              }
            }

            nextWalkingStates.push(new WalkingState(component.name, next, extensionList, ws.depth + 1, priority));
          }
        });
      });

      if (nextWalkingStates.length == 0) {
        // no where to go, still return context variables returned so far..
        return _.map(walkingStates, function (ws) {
          return new WalkingState(ws.name, [], ws.contextExtensionList);
        })
      }

      return walkTokenPath(tokenPath.splice(1), nextWalkingStates, context, editor);
    }

    exports.populateContext = function (tokenPath, context, editor, includeAutoComplete, components) {

      var walkStates = walkTokenPath(tokenPath, [new WalkingState("ROOT", components, [])], context, editor);
      if (includeAutoComplete) {
        var autoCompleteSet = [];
        _.each(walkStates, function (ws) {
          var contextForState = passThroughContext(context, ws.contextExtensionList);
          _.each(ws.components, function (c) {
            _.each(c.getTerms(contextForState, editor), function (t) {
              if (!_.isObject(t)) {
                t = { name: t };
              }
              autoCompleteSet.push(t);
            });
          })
        });
        _.uniq(autoCompleteSet, false);
        context.autoCompleteSet = autoCompleteSet;
      }

      // apply what values were set so far to context, selecting the deepest on which sets the context
      if (walkStates.length !== 0) {
        var wsToUse;
        walkStates = _.sortBy(walkStates, function (ws) {
          return _.isNumber(ws.priority) ? ws.priority : Number.MAX_VALUE;
        });
        wsToUse = _.find(walkStates, function (ws) {
          return _.isEmpty(ws.components)
        });
        if (!wsToUse && walkStates.length > 1 && !includeAutoComplete) {
          console.info("more then one context active for current path, but autocomplete isn't requested", walkStates);
        }
        if (!wsToUse) {
          wsToUse = walkStates[0];
        }
        _.each(wsToUse.contextExtensionList, function (e) {
          _.assign(context, e);
        });
      }

    };

  });
