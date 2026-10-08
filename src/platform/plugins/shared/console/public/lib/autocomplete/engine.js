/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import { ConstantComponent } from './components/constant_component';

const asArray = (val) => (Array.isArray(val) ? val : [val]);

export function wrapComponentWithDefaults(component, defaults) {
  const originalGetTerms = component.getTerms;
  component.getTerms = function (context, editor) {
    let result = originalGetTerms.call(component, context, editor);
    if (!result) {
      return result;
    }
    result = _.map(result, (term) => {
      if (!_.isObject(term)) {
        term = { name: term };
      }
      return _.defaults(term, defaults);
    });
    return result;
  };
  return component;
}

const tracer = function () {
  if (window.engine_trace) {
    console.log.call(console, ...arguments);
  }
};

function passThroughContext(context, extensionList) {
  function PTC() {}

  PTC.prototype = context;
  const result = new PTC();
  if (extensionList) {
    extensionList.unshift(result);
    _.assign.apply(_, extensionList);
    extensionList.shift();
  }
  return result;
}

export function WalkingState(
  parentName,
  components,
  contextExtensionList,
  { depth = 0, fallbackGroups = [], preferredFallbackGroups = [], priority, specificity = 0 } = {}
) {
  this.parentName = parentName;
  this.components = components;
  this.contextExtensionList = contextExtensionList;
  this.depth = depth;
  this.fallbackGroups = fallbackGroups;
  this.preferredFallbackGroups = preferredFallbackGroups;
  this.priority = priority;
  // Number of path segments matched literally (via a ConstantComponent).
  this.specificity = specificity;
}

function getNextGroups(result) {
  const nextGroups = result.nextGroups ?? [{ next: result.next, fallback: false }];
  const fallbackGroup =
    _.some(nextGroups, (nextGroup) => nextGroup.fallback) &&
    _.some(nextGroups, (nextGroup) => !nextGroup.fallback)
      ? _.uniqueId('fallback_group_')
      : undefined;

  return nextGroups.map((nextGroup) => ({
    next: nextGroup.next ? asArray(nextGroup.next) : [],
    fallbackGroup: nextGroup.fallback ? fallbackGroup : undefined,
    preferredFallbackGroup: !nextGroup.fallback ? fallbackGroup : undefined,
  }));
}

function resolveFallbackStates(walkStates) {
  const preferredFallbackGroups = new Set(_.flatMap(walkStates, 'preferredFallbackGroups'));
  if (!preferredFallbackGroups.size) {
    return walkStates;
  }
  return _.filter(
    walkStates,
    (ws) =>
      !_.some(ws.fallbackGroups, (fallbackGroup) => preferredFallbackGroups.has(fallbackGroup))
  );
}

function orderStatesForFallbackEvaluation(walkStates) {
  const preferredStatesByFallbackGroup = new Map();
  _.each(walkStates, (state) => {
    _.each(state.preferredFallbackGroups, (fallbackGroup) => {
      const preferredStates = preferredStatesByFallbackGroup.get(fallbackGroup) ?? [];
      preferredStates.push(state);
      preferredStatesByFallbackGroup.set(fallbackGroup, preferredStates);
    });
  });
  if (!preferredStatesByFallbackGroup.size) {
    return walkStates;
  }

  const orderedStates = [];
  const visitedStates = new Set();
  const visitedFallbackGroups = new Set();
  const visitState = (state) => {
    if (visitedStates.has(state)) {
      return;
    }
    visitedStates.add(state);

    _.each(state.fallbackGroups, (fallbackGroup) => {
      if (visitedFallbackGroups.has(fallbackGroup)) {
        return;
      }
      visitedFallbackGroups.add(fallbackGroup);
      _.each(preferredStatesByFallbackGroup.get(fallbackGroup), visitState);
    });
    orderedStates.push(state);
  };

  _.each(walkStates, visitState);
  return orderedStates;
}

function resolveAutocompleteFallbackStates(
  walkStates,
  preferredFallbackGroupsWithTerms,
  fallbackGroupsWithTerms
) {
  const preferredFallbackGroups = new Set(_.flatMap(walkStates, 'preferredFallbackGroups'));
  const prefersExplicitBranch = (fallbackGroup) =>
    preferredFallbackGroupsWithTerms.has(fallbackGroup) ||
    (!fallbackGroupsWithTerms.has(fallbackGroup) && preferredFallbackGroups.has(fallbackGroup));

  return _.filter(
    walkStates,
    (state) =>
      !_.some(state.fallbackGroups, prefersExplicitBranch) &&
      !_.some(
        state.preferredFallbackGroups,
        (fallbackGroup) => !prefersExplicitBranch(fallbackGroup)
      )
  );
}

function evaluateAutocompleteStates(walkStates, context, editor) {
  const stateTerms = new Map();
  const preferredFallbackGroupsWithTerms = new Set();
  const fallbackGroupsWithTerms = new Set();
  const statesByFallbackPreference = orderStatesForFallbackEvaluation(walkStates);
  _.each(statesByFallbackPreference, function (ws) {
    if (
      _.some(ws.fallbackGroups, (fallbackGroup) =>
        preferredFallbackGroupsWithTerms.has(fallbackGroup)
      )
    ) {
      return;
    }

    const contextForState = passThroughContext(context, ws.contextExtensionList);
    const termsForState = [];
    _.each(ws.components, function (component) {
      const terms = component.getTerms(contextForState, editor);
      if (terms) {
        termsForState.push(...terms);
      }
    });

    stateTerms.set(ws, termsForState);
    if (termsForState.length) {
      _.each(ws.preferredFallbackGroups, (fallbackGroup) => {
        preferredFallbackGroupsWithTerms.add(fallbackGroup);
      });
      _.each(ws.fallbackGroups, (fallbackGroup) => {
        fallbackGroupsWithTerms.add(fallbackGroup);
      });
    }
  });

  return {
    walkStates: resolveAutocompleteFallbackStates(
      walkStates,
      preferredFallbackGroupsWithTerms,
      fallbackGroupsWithTerms
    ),
    stateTerms,
  };
}

export const getTermsForWalkingStates = (walkStates, context, editor) => {
  const evaluation = evaluateAutocompleteStates(walkStates, context, editor);
  return _.flatMap(evaluation.walkStates, (state) => evaluation.stateTerms.get(state) ?? []);
};

export function walkTokenPath(
  tokenPath,
  walkingStates,
  context,
  editor,
  preserveFallbackStates = false
) {
  if (!tokenPath || tokenPath.length === 0) {
    return preserveFallbackStates ? walkingStates : resolveFallbackStates(walkingStates);
  }
  const token = tokenPath[0];
  const nextWalkingStates = [];

  tracer('starting token evaluation [' + token + ']');

  _.each(walkingStates, function (ws) {
    const contextForState = passThroughContext(context, ws.contextExtensionList);
    _.each(ws.components, function (component) {
      tracer('evaluating [' + token + '] with [' + component.name + ']', component);
      const result = component.match(token, contextForState, editor);
      if (result && !_.isEmpty(result)) {
        tracer('matched [' + token + '] with:', result);

        let extensionList;
        if (result.context_values) {
          extensionList = [];
          [].push.apply(extensionList, ws.contextExtensionList);
          extensionList.push(result.context_values);
        } else {
          extensionList = ws.contextExtensionList;
        }

        let priority = ws.priority;
        if (_.isNumber(result.priority)) {
          if (_.isNumber(priority)) {
            priority = Math.min(priority, result.priority);
          } else {
            priority = result.priority;
          }
        }

        const specificity = ws.specificity + (component instanceof ConstantComponent ? 1 : 0);

        if (result.nextStates) {
          _.each(result.nextStates, (nextState) => {
            let continuationPriority = priority;
            if (_.isNumber(nextState.priority)) {
              continuationPriority = _.isNumber(continuationPriority)
                ? Math.min(continuationPriority, nextState.priority)
                : nextState.priority;
            }
            nextWalkingStates.push(
              new WalkingState(
                nextState.parentName ?? component.name,
                nextState.components,
                extensionList.concat(nextState.contextExtensionList),
                {
                  depth: ws.depth + 1,
                  fallbackGroups: ws.fallbackGroups.concat(nextState.fallbackGroups),
                  preferredFallbackGroups: ws.preferredFallbackGroups.concat(
                    nextState.preferredFallbackGroups
                  ),
                  priority: continuationPriority,
                  specificity: specificity + nextState.specificity,
                }
              )
            );
          });
          return;
        }

        const nextGroups = getNextGroups(result);
        _.each(nextGroups, ({ next, fallbackGroup, preferredFallbackGroup }) => {
          nextWalkingStates.push(
            new WalkingState(component.name, next, extensionList, {
              depth: ws.depth + 1,
              fallbackGroups: fallbackGroup
                ? ws.fallbackGroups.concat(fallbackGroup)
                : ws.fallbackGroups,
              preferredFallbackGroups: preferredFallbackGroup
                ? ws.preferredFallbackGroups.concat(preferredFallbackGroup)
                : ws.preferredFallbackGroups,
              priority,
              specificity,
            })
          );
        });
      }
    });
  });

  if (nextWalkingStates.length === 0) {
    // no where to go, still return context variables returned so far..
    return resolveFallbackStates(
      _.map(walkingStates, function (ws) {
        return new WalkingState(ws.name, [], ws.contextExtensionList, {
          depth: ws.depth,
          fallbackGroups: ws.fallbackGroups,
          preferredFallbackGroups: ws.preferredFallbackGroups,
          priority: ws.priority,
          specificity: ws.specificity,
        });
      })
    );
  }

  return walkTokenPath(
    tokenPath.slice(1),
    nextWalkingStates,
    context,
    editor,
    preserveFallbackStates
  );
}

export function populateContext(tokenPath, context, editor, includeAutoComplete, components) {
  let walkStates = walkTokenPath(
    tokenPath,
    [new WalkingState('ROOT', components, [])],
    context,
    editor,
    includeAutoComplete
  );
  if (includeAutoComplete) {
    let autoCompleteSet = new Map();
    const evaluation = evaluateAutocompleteStates(walkStates, context, editor);
    walkStates = evaluation.walkStates;
    _.each(walkStates, (ws) => {
      const terms = evaluation.stateTerms.get(ws);
      if (!terms) {
        return;
      }
      _.each(terms, function (term) {
        const termObj = typeof term === 'string' ? { name: term } : term;

        // Add the term to the autoCompleteSet if it doesn't already exist
        if (!autoCompleteSet.has(termObj.name)) {
          autoCompleteSet.set(termObj.name, termObj);
        }
      });
    });
    // Convert Map values to an array of objects
    autoCompleteSet = Array.from(autoCompleteSet.values());
    context.autoCompleteSet = autoCompleteSet;
  }

  if (!includeAutoComplete) {
    walkStates = resolveFallbackStates(walkStates);
  }

  // Apply accumulated context from the best matching state.
  if (walkStates.length !== 0) {
    let wsToUse;
    // Sort by explicit priority first (lower wins), then prefer the most specific
    // path (more literally-matched segments) so a concrete endpoint is chosen over
    // a competing parameter pattern regardless of endpoint registration order.
    walkStates = _.sortBy(walkStates, [
      (ws) => (_.isNumber(ws.priority) ? ws.priority : Number.MAX_VALUE),
      (ws) => -ws.specificity,
    ]);
    wsToUse = _.find(walkStates, function (ws) {
      return _.isEmpty(ws.components);
    });

    if (!wsToUse && walkStates.length > 1 && !includeAutoComplete) {
      console.info(
        "more than one context active for current path, but autocomplete isn't requested",
        walkStates
      );
    }

    if (!wsToUse) {
      wsToUse = walkStates[0];
    }

    _.each(wsToUse.contextExtensionList, function (extension) {
      _.assign(context, extension);
    });
  }
}
