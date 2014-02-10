define([
  "_", "exports", "autocomplete/url_path_autocomplete"
], function (_, exports, url_path_autocomplete) {
  "use strict";

  exports.URL_PATH_END_MARKER = "__url_path_end__";

  function SharedComponent(name, parent) {
    url_path_autocomplete.AutocompleteComponent.call(this, name);
    this._nextDict = {};
    if (parent) {
      parent.addComponent(this);
    }
    // for debugging purposes
    this._parent = parent;
  }

  SharedComponent.prototype = _.create(
    url_path_autocomplete.AutocompleteComponent.prototype,
    { 'constructor': SharedComponent  });

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
  function ListComponent(name, list, parent, multi_valued) {
    SharedComponent.call(this, name, parent);
    this.listGenerator = _.isArray(list) ? function () {
      return list
    } : list;
    this.multi_valued = _.isUndefined(multi_valued) ? true : multi_valued;
  }

  ListComponent.prototype = _.create(SharedComponent.prototype, { "constructor": ListComponent });

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
      return null;
    };

    cls.match = function (token, context, editor) {
      if (!_.isArray(token)) {
        token = [ token ]
      }
      if (!this.validateToken(token, context, editor)) {
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

  (function (cls) {
    cls.match = function (token, context, editor) {
      var r = Object.getPrototypeOf(cls).match.call(this, token, context, editor);
      r.context_values = r.context_values || {};
      r.context_values[this.name] = token;
      return r;
    }

  })(SimpleParamComponent.prototype);

  function SimplePartComponent(name, parent, options) {
    SharedComponent.call(this, name, parent);
    if (_.isString(options)) {
      options = [options];
    }
    this.options = options || [name];
  }

  SimplePartComponent.prototype = _.create(SharedComponent.prototype, { "constructor": SimplePartComponent });

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
  })(SimplePartComponent.prototype);

  function AcceptEndpointComponent(endpoint, parent) {
    SharedComponent.call(this, endpoint.id, parent);
    this.endpoint = endpoint
  }

  AcceptEndpointComponent.prototype = _.create(SharedComponent.prototype, { "constructor": AcceptEndpointComponent });

  (function (cls) {

    cls.match = function (token, context, editor) {
      if (token !== exports.URL_PATH_END_MARKER) {
        return null;
      }
      if (this.endpoint.methods && -1 === _.indexOf(this.endpoint.methods, context.method)) {
        return null;
      }
      var r = Object.getPrototypeOf(cls).match.call(this, token, context, editor);
      r.context_values = r.context_values || {};
      r.context_values['endpoint'] = this.endpoint;
      if (_.isNumber(this.endpoint.priority)) {
        r.priority = this.endpoint.priority;
      }
      return r;
    }
  })(AcceptEndpointComponent.prototype);


  /**
   * @param globalSharedComponentFactories a dict of the following structure
   * that will be used as a fall back for pattern parameters (i.e.: {indices})
   * {
   *   indices: function (part, parent, endpoint) {
   *      return new SharedComponent(part, parent)
   *   }
   * }
   * @constructor
   */
  function UrlPatternMatcher(globalSharedComponentFactories) {
    // This is not really a component, just a handy container to make iteration logic simpler
    this.rootComponent = new SharedComponent("ROOT");
    this.globalSharedComponentFactories = globalSharedComponentFactories || {};
  }

  (function (cls) {
    cls.addEndpoint = function (pattern, endpoint) {
      var c,
        active_component = this.rootComponent,
        endpointComponents = endpoint.url_components || {};
      var partList = pattern.split("/");
      _.each(partList, function (part, partIndex) {
        if (part.search(/^{.+}$/) >= 0) {
          part = part.substr(1, part.length - 2);
          if (active_component.getComponent(part)) {
            // we already have something for this, reuse
            active_component = active_component.getComponent(part);
            return;
          }
          // a new path, resolve.

          if ((c = endpointComponents[part])) {
            // endpoint specific. Support list
            if (_.isArray(c)) {
              c = new ListComponent(part, c, active_component);
            }
            else {
              console.warn("incorrectly configured url component ", part, " in endpoint", endpoint);
              c = new SharedComponent(part);
            }
          }
          else if ((c = this.globalSharedComponentFactories[part])) {
            // c is a f
            c = c(part, active_component, endpoint);
          }
          else {
            // just accept whatever with not suggestions
            c = new SimpleParamComponent(part, active_component);
          }

          active_component = c;
        }
        else {
          // not pattern
          var lookAhead = part, s;

          for (partIndex++; partIndex < partList.length; partIndex++) {
            s = partList[partIndex];
            if (s.indexOf("{") >= 0) {
              break;
            }
            lookAhead += "/" + s;

          }

          if (active_component.getComponent(part)) {
            // we already have something for this, reuse
            active_component = active_component.getComponent(part);
            active_component.addOption(lookAhead);
          }
          else {
            c = new SimplePartComponent(part, active_component, lookAhead);
            active_component = c;
          }
        }
      }, this);
      // mark end of endpoint path
      new AcceptEndpointComponent(endpoint, active_component);
    };

    cls.getTopLevelComponents = function () {
      return this.rootComponent.next;
    }

  })(UrlPatternMatcher.prototype);

  exports.UrlPatternMatcher = UrlPatternMatcher;
  exports.SharedComponent = SharedComponent;
  exports.ListComponent = ListComponent;
});