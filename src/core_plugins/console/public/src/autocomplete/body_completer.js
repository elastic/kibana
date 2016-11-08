import _ from 'lodash';
import engine from './engine';

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
 * @param description a json dict describing the endpoint
 * @param compilingContext
 */
function compileDescription(description, compilingContext) {
  if (_.isArray(description)) {
    return [compileList(description, compilingContext)];
  }
  else if (_.isObject(description)) {
    // test for objects list as arrays are also objects
    if (description.__scope_link) {
      return [new ScopeResolver(description.__scope_link, compilingContext)]
    }
    if (description.__any_of) {
      return [compileList(description.__any_of, compilingContext)];
    }
    if (description.__one_of) {
      return _.flatten(_.map(description.__one_of, function (d) {
        return compileDescription(d, compilingContext);
      }));
    }
    let obj = compileObject(description, compilingContext);
    if (description.__condition) {
      return [compileCondition(description.__condition, obj, compilingContext)];
    } else {
      return [obj];
    }
  }
  else if (_.isString(description) && /^\{.*\}$/.test(description)) {
    return [compileParametrizedValue(description, compilingContext)];
  }
  else {
    return [new engine.ConstantComponent(description)];
  }

}

function compileParametrizedValue(value, compilingContext, template) {
  value = value.substr(1, value.length - 2).toLowerCase();
  var component = compilingContext.parametrizedComponentFactories[value];
  if (!component) {
    throw new Error("no factory found for '" + value + "'");
  }
  component = component(value, null, template);
  if (!_.isUndefined(template)) {
    component = engine.wrapComponentWithDefaults(component, { template: template });
  }
  return component;

}

function compileObject(objDescription, compilingContext) {
  var objectC = new engine.ConstantComponent("{");
  var constants = [], patterns = [];
  _.each(objDescription, function (desc, key) {
    if (key.indexOf("__") == 0) {
      // meta key
      return;
    }

    var options = getOptions(desc), component;
    if (/^\{.*\}$/.test(key)) {
      component = compileParametrizedValue(key, compilingContext, options.template);
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
    _.map(compileDescription(desc, compilingContext), function (subComponent) {
      component.addComponent(subComponent);
    });
  });
  objectC.addComponent(new ObjectComponent("inner", constants, patterns));
  return objectC;
}

function compileList(listRule, compilingContext) {
  var listC = new engine.ConstantComponent("[");
  _.each(listRule, function (desc) {
    _.each(compileDescription(desc, compilingContext), function (component) {
      listC.addComponent(component);
    });
  });
  return listC;
}

/** takes a compiled object and wraps in a {@link ConditionalProxy }*/
function compileCondition(description, compiledObject) {
  if (description.lines_regex) {
    return new ConditionalProxy(function (context, editor) {
      let lines = editor.getSession().getLines(context.requestStartRow, editor.getCursorPosition().row).join("\n");
      return new RegExp(description.lines_regex, "m").test(lines);
    }, compiledObject);
  } else {
    throw "unknown condition type - got: " + JSON.stringify(description);
  }
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
  { 'constructor': ObjectComponent });


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
function ScopeResolver(link, compilingContext) {
  engine.SharedComponent.call(this, "__scope_link", null);
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
  { 'constructor': ScopeResolver });


(function (cls) {

  cls.resolveLinkToComponents = function (context, editor) {
    if (_.isFunction(this.link)) {
      var desc = this.link(context, editor);
      return compileDescription(desc, this.compilingContext);
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


function ConditionalProxy(predicate, delegate) {
  engine.SharedComponent.call(this, "__condition", null);
  this.predicate = predicate;
  this.delegate = delegate;
}

ConditionalProxy.prototype = _.create(
  engine.SharedComponent.prototype,
  { 'constructor': ConditionalProxy });


(function (cls) {

  cls.getTerms = function (context, editor) {
    if (this.predicate(context, editor)) {
      return this.delegate.getTerms(context, editor);
    } else {
      return null;
    }
  };

  cls.match = function (token, context, editor) {
    if (this.predicate(context, editor)) {
      return this.delegate.match(token, context, editor);
    } else {
      return false;
    }
  };
})(ConditionalProxy.prototype);


function GlobalOnlyComponent(name) {
  engine.AutocompleteComponent.call(this, name);
}

GlobalOnlyComponent.prototype = _.create(
  engine.AutocompleteComponent.prototype,
  { 'constructor': ObjectComponent });


(function (cls) {

  cls.getTerms = function () {
    return null;
  };

  cls.match = function (token, context) {
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
module.exports.globalsOnlyAutocompleteComponents = function () {
  return [new GlobalOnlyComponent("__global__")];
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
module.exports.compileBodyDescription = function (endpoint_id, description, parametrizedComponentFactories) {
  return compileDescription(description, new CompilingContext(endpoint_id, parametrizedComponentFactories));
};
