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

export function wrapComponentWithDefaults(component, defaults) {
  const originalGetTerms = component.getTerms;
  component.getTerms = function (context, editor) {
    let result = originalGetTerms.call(component, context, editor);
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
  return component;
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

export function WalkingState(parentName, components, contextExtensionList, depth, priority) {
  this.parentName = parentName;
  this.components = components;
  this.contextExtensionList = contextExtensionList;
  this.depth = depth || 0;
  this.priority = priority;
}


export function walkTokenPath(tokenPath, walkingStates, context, editor) {
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
