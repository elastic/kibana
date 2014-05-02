define([
  "_", "exports", "./engine"
], function (_, exports, engine) {
  "use strict";


  function CompilingContext(endpoint_id, parametrizedComponentFactories) {
    this.parametrizedComponentFactories = parametrizedComponentFactories;
    this.endpoint_id = endpoint_id;
  }

  function getTemplate(description) {
    if (description.__template) {
      return description.__template;
    }
    else if (description.__one_of) {
      return getTemplate(description.__one_of[0]);
    }
    else if (description.__any_of) {
      return [];
    }
    else if (description.__scope_link) {
      // assume an object for now.
      return {};
    }
    else if (_.isArray(description)) {
      if (description.length == 1) {
        if (_.isObject(description[0])) {
          // shortcut to save typing
          var innerTemplate = getTemplate(description[0]);

          return innerTemplate != null ? [innerTemplate] : [];
        }
      }
      return [];
    }
    else if (_.isObject(description)) {
      return {};
    }
    else if (_.isString(description) && !/^\{.*\}$/.test(description)) {
      return description;
    }
    else {
      return description;
    }
  }

  function getOptions(description) {
    var options = {};
    var template = getTemplate(description);

    if (!_.isUndefined(template)) {
      options.template = template;
    }
    return options;
  }

  /**
   * @param parent component for this description. can be null.
   * @param description a json dict describing the endpoint
   * @param compilingContext
   */
  function compileDescription(parent, description, compilingContext) {
    if (_.isArray(description)) {
      return compileList(parent, description, compilingContext);
    }
    else if (_.isObject(description)) {
      // test for objects list as arrays are also objects
      if (description.__scope_link) {
        return [new ScopeResolver(parent, description.__scope_link, compilingContext)]
      }
      if (description.__any_of) {
        return compileList(parent, description.__any_of, compilingContext);
      }
      if (description.__one_of) {
        return _.map(description.__one_of, function (d) {
          return compileDescription(parent, d, compilingContext);
        })
      }
      return compileObject(parent, description, compilingContext);
    }
    else if (_.isString(description) && /^\{.*\}$/.test(description)) {
      return compileParametrizedValue(parent, description, compilingContext);
    }
    else {
      return [new engine.ConstantComponent(description, parent)];
    }

  }

  function compileParametrizedValue(parent, value, compilingContext, template) {
    value = value.substr(1, value.length - 2).toLowerCase();
    var component = compilingContext.parametrizedComponentFactories[value];
    if (!component) {
      throw new Error("no factory found for '" + value + "'");
    }
    component = component(value, parent, template);
    if (!_.isUndefined(template)) {
      component = engine.wrapComponentWithDefaults(component, { template: template });
    }
    return [ component ];

  }

  function compileObject(parent, objDescription, compilingContext) {
    var objectC = new engine.ConstantComponent("{", parent);
    var constants = [], patterns = [];
    _.each(objDescription, function (desc, key) {
      if (key.indexOf("__") == 0) {
        // meta key
        return;
      }

      var options = getOptions(desc), component;
      if (/^\{.*\}$/.test(key)) {
        component = compileParametrizedValue(null, key, compilingContext, options.template)[0];
        patterns.push(component);
      }
      else if (key === "*") {
        component = new engine.SharedComponent(key);
        patterns.push(component);
      }
      else {
        options.name = key;
        component = new engine.ConstantComponent(key, null, [options]);
        constants.push(component);
      }
      compileDescription(component, desc, compilingContext);
    });
    objectC.addComponent(new ObjectComponent("inner", constants, patterns));
    return [objectC];
  }

  function compileList(parent, listRule, compilingContext) {
    var listC = new engine.ConstantComponent("[", parent);
    _.each(listRule, function (desc) {
      compileDescription(listC, desc, compilingContext);
    });
    return [listC];
  }

  /**
   * @param constants list of components that represent constant keys
   * @param patternsAndWildCards list of components that represent patterns and should be matched only if
   * there is no constant matches
   */
  function ObjectComponent(name, constants, patternsAndWildCards) {
    engine.AutocompleteComponent.call(this, name);
    this.constants = constants;
    this.patternsAndWildCards = patternsAndWildCards;
  }

  ObjectComponent.prototype = _.create(
    engine.AutocompleteComponent.prototype,
    { 'constructor': ObjectComponent  });


  (function (cls) {
    cls.getTerms = function (context, editor) {
      var options = [];
      _.each(this.constants, function (component) {
        options.push.apply(options, component.getTerms(context, editor));
      });
      _.each(this.patternsAndWildCards, function (component) {
        options.push.apply(options, component.getTerms(context, editor));
      });
      return options;
    };

    cls.match = function (token, context, editor) {
      var result = {
        next: []
      };
      _.each(this.constants, function (component) {
        var componentResult = component.match(token, context, editor);
        if (componentResult && componentResult.next) {
          result.next.push.apply(result.next, componentResult.next);
        }
      });

      // try to link to GLOBAL rules
      var globalRules = context.globalComponentResolver(token, false);
      if (globalRules) {
        result.next.push.apply(result.next, globalRules);
      }

      if (result.next.length) {
        return result;
      }
      _.each(this.patternsAndWildCards, function (component) {
        var componentResult = component.match(token, context, editor);
        if (componentResult && componentResult.next) {
          result.next.push.apply(result.next, componentResult.next);
        }
      });

      return result;

    };
  })(ObjectComponent.prototype);

  /**
   * An object to resolve scope links (syntax endpoint.path1.path2)
   * @param link the link either string (endpoint.path1.path2, or .path1.path2) or a function (context,editor)
   * which returns a description to be compiled
   * @constructor
   * @param compilingContext
   *
   *
   * For this to work we expect the context to include a method context.endpointComponentResolver(endpoint)
   * which should return the top level components for the given endpoint
   */
  function ScopeResolver(parent, link, compilingContext) {
    engine.SharedComponent.call(this, "__scope_link", parent);
    if (_.isString(link) && link[0] === ".") {
      // relative link, inject current endpoint
      if (link === ".") {
        link = compilingContext.endpoint_id;
      }
      else {
        link = compilingContext.endpoint_id + link;
      }
    }
    this.link = link;
    this.compilingContext = compilingContext;
  }

  ScopeResolver.prototype = _.create(
    engine.SharedComponent.prototype,
    { 'constructor': ScopeResolver  });


  (function (cls) {

    cls.resolveLinkToComponents = function (context, editor) {
      if (_.isFunction(this.link)) {
        var desc = this.link(context, editor);
        return compileDescription(null, desc, this.compilingContext);
      }
      if (!_.isString(this.link)) {
        throw new Error("unsupported link format", this.link);
      }

      var path = this.link.replace(/\./g, "{").split(/(\{)/);
      var endpoint = path[0];
      var components;
      try {
        if (endpoint === "GLOBAL") {
          // global rules need an extra indirection
          if (path.length < 3) {
            throw new Error("missing term in global link: " + this.link);
          }
          var term = path[2];
          components = context.globalComponentResolver(term);
          path = path.slice(3);
        }
        else {
          path = path.slice(1);
          components = context.endpointComponentResolver(endpoint);
        }
      }
      catch (e) {
        throw new Error("failed to resolve link [" + this.link + "]: " + e);
      }
      return engine.resolvePathToComponents(path, context, editor, components);
    };

    cls.getTerms = function (context, editor) {
      var options = [], components = this.resolveLinkToComponents(context, editor);
      _.each(components, function (component) {
        options.push.apply(options, component.getTerms(context, editor));
      });
      return options;
    };

    cls.match = function (token, context, editor) {
      var result = {
          next: []
        },
        components = this.resolveLinkToComponents(context, editor);

      _.each(components, function (component) {
        var componentResult = component.match(token, context, editor);
        if (componentResult && componentResult.next) {
          result.next.push.apply(result.next, componentResult.next);
        }
      });

      return result;
    };
  })(ScopeResolver.prototype);


  function GlobalOnlyComponent(name) {
    engine.AutocompleteComponent.call(this, name);
  }

  GlobalOnlyComponent.prototype = _.create(
    engine.AutocompleteComponent.prototype,
    { 'constructor': ObjectComponent  });


  (function (cls) {

    cls.getTerms = function (context, editor) {
      return null;
    };

    cls.match = function (token, context, editor) {
      var result = {
        next: []
      };

      // try to link to GLOBAL rules
      var globalRules = context.globalComponentResolver(token, false);
      if (globalRules) {
        result.next.push.apply(result.next, globalRules);
      }

      if (result.next.length) {
        return result;
      }
      // just loop back to us
      result.next = [this];

      return result;

    };
  })(GlobalOnlyComponent.prototype);


  // a list of component that match anything but give auto complete suggestions based on global API entries.
  exports.globalsOnlyAutocompleteComponents = function () {
    return [ new GlobalOnlyComponent("__global__")];
  };

  /**
   * @param endpoint_id id of the endpoint being compiled.
   * @param description a json dict describing the endpoint
   * @param endpointComponentResolver a function (endpoint,context,editor) which should resolve an endpoint
   *        to it's list of compiled components.
   * @param parametrizedComponentFactories a dict of the following structure
   * that will be used as a fall back for pattern keys (i.e.: {type} ,resolved without the $s)
   * {
   *   TYPE: function (part, parent, endpoint) {
   *      return new SharedComponent(part, parent)
   *   }
   * }
   */
  exports.compileBodyDescription = function (endpoint_id, description, parametrizedComponentFactories) {
    return compileDescription(null, description, new CompilingContext(endpoint_id, parametrizedComponentFactories));
  };

});