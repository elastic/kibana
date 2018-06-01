/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const _ = require('lodash');

export function AutocompleteComponent(name) {
  this.name = name;
}

/** called to get the possible suggestions for tokens, when this object is at the end of
 * the resolving chain (and thus can suggest possible continuation paths)
 */
AutocompleteComponent.prototype.getTerms = function () {
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
AutocompleteComponent.prototype.match = function () {
  return {
    next: this.next
  };
};

function SharedComponent(name, parent) {
  AutocompleteComponent.call(this, name);
  this._nextDict = {};
  if (parent) {
    parent.addComponent(this);
  }
  // for debugging purposes
  this._parent = parent;
}

SharedComponent.prototype = _.create(
  AutocompleteComponent.prototype,
  { 'constructor': SharedComponent });

(function (cls) {
  /* return the first component with a given name */
  cls.getComponent = function (name) {
    return (this._nextDict[name] || [undefined])[0];
  };

  cls.addComponent = function (component) {
    const current = this._nextDict[component.name] || [];
    current.push(component);
    this._nextDict[component.name] = current;
    this.next = [].concat.apply([], _.values(this._nextDict));
  };

}(SharedComponent.prototype));

/** A component that suggests one of the give options, but accepts anything */
function ListComponent(name, list, parent, multiValued, allowNonValidValues) {
  SharedComponent.call(this, name, parent);
  this.listGenerator = Array.isArray(list) ? function () {
    return list;
  } : list;
  this.multiValued = _.isUndefined(multiValued) ? true : multiValued;
  this.allowNonValidValues = _.isUndefined(allowNonValidValues) ? false : allowNonValidValues;
}

ListComponent.prototype = _.create(SharedComponent.prototype, { 'constructor': ListComponent });


(function (cls) {
  cls.getTerms = function (context, editor) {
    if (!this.multiValued && context.otherTokenValues) {
      // already have a value -> no suggestions
      return [];
    }
    let alreadySet = context.otherTokenValues || [];
    if (_.isString(alreadySet)) {
      alreadySet = [alreadySet];
    }
    let ret = _.difference(this.listGenerator(context, editor), alreadySet);

    if (this.getDefaultTermMeta()) {
      const meta = this.getDefaultTermMeta();
      ret = _.map(ret, function (term) {
        if (_.isString(term)) {
          term = { 'name': term };
        }
        return _.defaults(term, { meta: meta });
      });
    }

    return ret;
  };

  cls.validateTokens = function (tokens) {
    if (!this.multiValued && tokens.length > 1) {
      return false;
    }

    // verify we have all tokens
    const list = this.listGenerator();
    const notFound = _.any(tokens, function (token) {
      return list.indexOf(token) === -1;
    });

    if (notFound) {
      return false;
    }
    return true;
  };

  cls.getContextKey = function () {
    return this.name;
  };

  cls.getDefaultTermMeta = function () {
    return this.name;
  };

  cls.match = function (token, context, editor) {
    if (!Array.isArray(token)) {
      token = [token];
    }
    if (!this.allowNonValidValues && !this.validateTokens(token, context, editor)) {
      return null;
    }

    const result = Object.getPrototypeOf(cls).match.call(this, token, context, editor);
    result.context_values = result.context_values || {};
    result.context_values[this.getContextKey()] = token;
    return result;
  };
}(ListComponent.prototype));

function SimpleParamComponent(name, parent) {
  SharedComponent.call(this, name, parent);
}

SimpleParamComponent.prototype = _.create(SharedComponent.prototype, { 'constructor': SimpleParamComponent });

(function (cls) {
  cls.match = function (token, context, editor) {
    const result = Object.getPrototypeOf(cls).match.call(this, token, context, editor);
    result.context_values = result.context_values || {};
    result.context_values[this.name] = token;
    return result;
  };

}(SimpleParamComponent.prototype));

function ConstantComponent(name, parent, options) {
  SharedComponent.call(this, name, parent);
  if (_.isString(options)) {
    options = [options];
  }
  this.options = options || [name];
}

ConstantComponent.prototype = _.create(SharedComponent.prototype, { 'constructor': ConstantComponent });

export { SharedComponent, ListComponent, SimpleParamComponent, ConstantComponent };

(function (cls) {
  cls.getTerms = function () {
    return this.options;
  };

  cls.addOption = function (options) {
    if (!Array.isArray(options)) {
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

  };
}(ConstantComponent.prototype));

export function wrapComponentWithDefaults(component, defaults) {
  function Wrapper() {

  }

  Wrapper.prototype = {};
  for (const key in component) {
    if (_.isFunction(component[key])) {
      Wrapper.prototype[key] = _.bindKey(component, key);
    }
  }

  Wrapper.prototype.getTerms = function (context, editor) {
    let result = component.getTerms(context, editor);
    if (!result) {
      return result;
    }
    result = _.map(result, function (term) {
      if (!_.isObject(term)) {
        term = { name: term };
      }
      return _.defaults(term, defaults);
    }, this);
    return result;
  };
  return new Wrapper();
}

const tracer = function () {
  if (window.engine_trace) {
    console.log.call(console, arguments);
  }
};


function passThroughContext(context, extensionList) {
  function PTC() {

  }

  PTC.prototype = context;
  const result = new PTC();
  if (extensionList) {
    extensionList.unshift(result);
    _.assign.apply(_, extensionList);
    extensionList.shift();
  }
  return result;
}

function WalkingState(parentName, components, contextExtensionList, depth, priority) {
  this.parentName = parentName;
  this.components = components;
  this.contextExtensionList = contextExtensionList;
  this.depth = depth || 0;
  this.priority = priority;
}


function walkTokenPath(tokenPath, walkingStates, context, editor) {
  if (!tokenPath || tokenPath.length === 0) {
    return walkingStates;
  }
  const token = tokenPath[0];
  const  nextWalkingStates = [];

  tracer('starting token evaluation [' + token + ']');

  _.each(walkingStates, function (ws) {
    const contextForState = passThroughContext(context, ws.contextExtensionList);
    _.each(ws.components, function (component) {
      tracer('evaluating [' + token + '] with [' + component.name + ']', component);
      const result = component.match(token, contextForState, editor);
      if (result && !_.isEmpty(result)) {
        tracer('matched [' + token + '] with:', result);
        let next;
        let extensionList;
        if (result.next && !Array.isArray(result.next)) {
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

        let priority = ws.priority;
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

  if (nextWalkingStates.length === 0) {
    // no where to go, still return context variables returned so far..
    return _.map(walkingStates, function (ws) {
      return new WalkingState(ws.name, [], ws.contextExtensionList);
    });
  }

  return walkTokenPath(tokenPath.slice(1), nextWalkingStates, context, editor);
}

export function resolvePathToComponents(tokenPath, context, editor, components) {
  const walkStates = walkTokenPath(tokenPath, [new WalkingState('ROOT', components, [])], context, editor);
  const result = [].concat.apply([], _.pluck(walkStates, 'components'));
  return result;
}

export function populateContext(tokenPath, context, editor, includeAutoComplete, components) {

  let walkStates = walkTokenPath(tokenPath, [new WalkingState('ROOT', components, [])], context, editor);
  if (includeAutoComplete) {
    let autoCompleteSet = [];
    _.each(walkStates, function (ws) {
      const contextForState = passThroughContext(context, ws.contextExtensionList);
      _.each(ws.components, function (component) {
        _.each(component.getTerms(contextForState, editor), function (term) {
          if (!_.isObject(term)) {
            term = { name: term };
          }
          autoCompleteSet.push(term);
        });
      });
    });
    autoCompleteSet = _.uniq(autoCompleteSet, false);
    context.autoCompleteSet = autoCompleteSet;
  }

  // apply what values were set so far to context, selecting the deepest on which sets the context
  if (walkStates.length !== 0) {
    let wsToUse;
    walkStates = _.sortBy(walkStates, function (ws) {
      return _.isNumber(ws.priority) ? ws.priority : Number.MAX_VALUE;
    });
    wsToUse = _.find(walkStates, function (ws) {
      return _.isEmpty(ws.components);
    });

    if (!wsToUse && walkStates.length > 1 && !includeAutoComplete) {
      console.info('more then one context active for current path, but autocomplete isn\'t requested', walkStates);
    }

    if (!wsToUse) {
      wsToUse = walkStates[0];
    }

    _.each(wsToUse.contextExtensionList, function (extension) {
      _.assign(context, extension);
    });
  }
}
