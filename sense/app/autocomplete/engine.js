define([
  'exports',
  '_'
],
  function (exports, _) {
    "use strict";

    exports.AutocompleteComponent = function (name) {
      this.name = name;
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

    function SharedComponent(name, parent) {
      exports.AutocompleteComponent.call(this, name);
      this._nextDict = {};
      if (parent) {
        parent.addComponent(this);
      }
      // for debugging purposes
      this._parent = parent;
    }

    SharedComponent.prototype = _.create(
      exports.AutocompleteComponent.prototype,
      { 'constructor': SharedComponent  });

    exports.SharedComponent = SharedComponent;

    (function (cls) {
      cls.getComponent = function (name) {
        return this._nextDict[name];
      };

      cls.addComponent = function (c) {
        this._nextDict[c.name] = c;
        this.next = _.values(this._nextDict);
      };

    })(SharedComponent.prototype);

    /** A component that suggests one of the give options, but accepts anything */
    function ListComponent(name, list, parent, multi_valued, allow_non_valid_values) {
      SharedComponent.call(this, name, parent);
      this.listGenerator = _.isArray(list) ? function () {
        return list
      } : list;
      this.multi_valued = _.isUndefined(multi_valued) ? true : multi_valued;
      this.allow_non_valid_values = _.isUndefined(allow_non_valid_values) ? false : allow_non_valid_values;
    }

    ListComponent.prototype = _.create(SharedComponent.prototype, { "constructor": ListComponent });
    exports.ListComponent = ListComponent;


    (function (cls) {
      cls.getTerms = function (context, editor) {
        if (!this.multi_valued && context.otherTokenValues) {
          // already have a value -> no suggestions
          return []
        }
        var already_set = context.otherTokenValues || [];
        if (_.isString(already_set)) {
          already_set = [already_set];
        }
        var ret = _.difference(this.listGenerator(context, editor), already_set);

        if (this.getDefaultTermMeta()) {
          var meta = this.getDefaultTermMeta();
          ret = _.map(ret, function (t) {
            if (_.isString(t)) {
              t = { "name": t};
            }
            return _.defaults(t, { meta: meta });
          });
        }

        return ret;
      };

      cls.validateToken = function (token, context, editor) {
        if (!this.multi_valued && token.length > 1) {
          return false;
        }

        // verify we have all tokens
        var list = this.listGenerator();
        var not_found = _.any(token, function (p) {
          return list.indexOf(p) == -1;
        });

        if (not_found) {
          return false;
        }
        return true;
      };

      cls.getContextKey = function (context, editor) {
        return this.name;
      };

      cls.getDefaultTermMeta = function (context, editor) {
        return this.name;
      };

      cls.match = function (token, context, editor) {
        if (!_.isArray(token)) {
          token = [ token ]
        }
        if (!this.allow_non_valid_values && !this.validateToken(token, context, editor)) {
          return null
        }

        var r = Object.getPrototypeOf(cls).match.call(this, token, context, editor);
        r.context_values = r.context_values || {};
        r.context_values[this.getContextKey()] = token;
        return r;
      }
    })(ListComponent.prototype);

    function SimpleParamComponent(name, parent) {
      SharedComponent.call(this, name, parent);
    }

    SimpleParamComponent.prototype = _.create(SharedComponent.prototype, { "constructor": SimpleParamComponent });
    exports.SimpleParamComponent = SimpleParamComponent;

    (function (cls) {
      cls.match = function (token, context, editor) {
        var r = Object.getPrototypeOf(cls).match.call(this, token, context, editor);
        r.context_values = r.context_values || {};
        r.context_values[this.name] = token;
        return r;
      }

    })(SimpleParamComponent.prototype);

    function ConstantComponent(name, parent, options) {
      SharedComponent.call(this, name, parent);
      if (_.isString(options)) {
        options = [options];
      }
      this.options = options || [name];
    }

    ConstantComponent.prototype = _.create(SharedComponent.prototype, { "constructor": ConstantComponent });
    exports.ConstantComponent = ConstantComponent;

    (function (cls) {
      cls.getTerms = function () {
        return this.options;
      };

      cls.addOption = function (options) {
        if (!_.isArray(options)) {
          options = [options];
        }

        [].push.apply(this.options, options);
        this.options = _.uniq(this.options);
      };
      cls.match = function (token, context, editor) {
        if (token !== this.name) {
          return null;
        }

        return Object.getPrototypeOf(cls).match.call(this, token, context, editor);

      }
    })(ConstantComponent.prototype);


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
