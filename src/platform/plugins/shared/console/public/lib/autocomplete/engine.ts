/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';

import type {
  AutocompleteComponent,
  AutocompleteMatchResult,
  AutocompleteTermDefinition,
} from './components/autocomplete_component';
import { ConstantComponent } from './components/constant_component';
import type { AutoCompleteContext, ResultTerm } from './types';
import { asArray } from '../utils/array_utils';

declare global {
  interface Window {
    engine_trace?: boolean;
  }
}

type AutocompleteContext = AutoCompleteContext;

interface WalkingStateOptions {
  depth?: number;
  fallbackGroups?: string[];
  preferredFallbackGroups?: string[];
  priority?: number;
  specificity?: number;
}

export function wrapComponentWithDefaults<T extends AutocompleteComponent>(
  component: T,
  defaults: Record<string, unknown>
): T {
  const originalGetTerms = component.getTerms;
  component.getTerms = function (context: unknown, editor: unknown) {
    const result = originalGetTerms.call(component, context, editor);
    if (!result) {
      return result;
    }
    return _.map(result, (term: AutocompleteTermDefinition) => {
      const termObj: ResultTerm = typeof term === 'string' ? { name: term } : term;
      return _.defaults(termObj, defaults);
    });
  };
  return component;
}

const tracer = (...args: unknown[]) => {
  if (window.engine_trace) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

function passThroughContext(
  context: AutocompleteContext,
  extensionList?: Array<Record<string, unknown>>
): AutocompleteContext {
  const result: AutocompleteContext = Object.create(context);
  if (extensionList) {
    extensionList.unshift(result);
    const [target, ...sources] = extensionList;
    _.assign(target, ...sources);
    extensionList.shift();
  }
  return result;
}

export class WalkingState {
  name?: string;
  parentName: string | undefined;
  components: AutocompleteComponent[];
  contextExtensionList: Array<Record<string, unknown>>;
  depth: number;
  fallbackGroups: string[];
  preferredFallbackGroups: string[];
  priority: number | undefined;
  // Number of path segments matched literally (via a ConstantComponent). Used to
  // prefer the most specific endpoint when several patterns match the same path,
  // e.g. `_connector/_sync_job` should match the literal `_sync_job` endpoint
  // rather than the `_connector/{connector_id}` parameter endpoint.
  specificity: number;

  constructor(
    parentName: string | undefined,
    components: AutocompleteComponent[],
    contextExtensionList: Array<Record<string, unknown>>,
    {
      depth = 0,
      fallbackGroups = [],
      preferredFallbackGroups = [],
      priority,
      specificity = 0,
    }: WalkingStateOptions = {}
  ) {
    this.parentName = parentName;
    this.components = components;
    this.contextExtensionList = contextExtensionList;
    this.depth = depth;
    this.fallbackGroups = fallbackGroups;
    this.preferredFallbackGroups = preferredFallbackGroups;
    this.priority = priority;
    this.specificity = specificity;
  }
}

function getNextGroups(result: AutocompleteMatchResult): Array<{
  next: AutocompleteComponent[];
  fallbackGroup?: string;
  preferredFallbackGroup?: string;
}> {
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

function resolveFallbackStates(walkStates: WalkingState[]): WalkingState[] {
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

function orderStatesForFallbackEvaluation(walkStates: WalkingState[]): WalkingState[] {
  const preferredStatesByFallbackGroup = new Map<string, WalkingState[]>();
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

  const orderedStates: WalkingState[] = [];
  const visitedStates = new Set<WalkingState>();
  const visitedFallbackGroups = new Set<string>();
  const visitState = (state: WalkingState) => {
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
  walkStates: WalkingState[],
  preferredFallbackGroupsWithTerms: Set<string>,
  fallbackGroupsWithTerms: Set<string>
): WalkingState[] {
  const preferredFallbackGroups = new Set(_.flatMap(walkStates, 'preferredFallbackGroups'));
  const prefersExplicitBranch = (fallbackGroup: string) =>
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

interface AutocompleteStateEvaluation {
  walkStates: WalkingState[];
  stateTerms: Map<WalkingState, AutocompleteTermDefinition[]>;
}

function evaluateAutocompleteStates(
  walkStates: WalkingState[],
  context: AutocompleteContext,
  editor: unknown
): AutocompleteStateEvaluation {
  const stateTerms = new Map<WalkingState, AutocompleteTermDefinition[]>();
  const preferredFallbackGroupsWithTerms = new Set<string>();
  const fallbackGroupsWithTerms = new Set<string>();
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
    const termsForState: AutocompleteTermDefinition[] = [];
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

export const getTermsForWalkingStates = (
  walkStates: WalkingState[],
  context: AutocompleteContext,
  editor: unknown
): AutocompleteTermDefinition[] => {
  const evaluation = evaluateAutocompleteStates(walkStates, context, editor);
  return _.flatMap(evaluation.walkStates, (state) => evaluation.stateTerms.get(state) ?? []);
};

export function walkTokenPath(
  tokenPath: Array<string | string[]>,
  walkingStates: WalkingState[],
  context: AutocompleteContext,
  editor: unknown,
  preserveFallbackStates = false
): WalkingState[] {
  if (!tokenPath || tokenPath.length === 0) {
    return preserveFallbackStates ? walkingStates : resolveFallbackStates(walkingStates);
  }
  const token = tokenPath[0];
  const nextWalkingStates: WalkingState[] = [];

  tracer('starting token evaluation [' + token + ']');

  _.each(walkingStates, function (ws) {
    const contextForState = passThroughContext(context, ws.contextExtensionList);
    _.each(ws.components, function (component) {
      tracer('evaluating [' + token + '] with [' + component.name + ']', component);
      const result = component.match(token, contextForState, editor);
      if (result && !_.isEmpty(result)) {
        tracer('matched [' + token + '] with:', result);

        let extensionList: Array<Record<string, unknown>>;
        if (result.context_values) {
          extensionList = ws.contextExtensionList.slice();
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

export function populateContext(
  tokenPath: Array<string | string[]>,
  context: AutocompleteContext,
  editor: unknown,
  includeAutoComplete: boolean,
  components: AutocompleteComponent[]
): void {
  let walkStates = walkTokenPath(
    tokenPath,
    [new WalkingState('ROOT', components, [])],
    context,
    editor,
    includeAutoComplete
  );
  if (includeAutoComplete) {
    const autoCompleteSet = new Map<ResultTerm['name'], ResultTerm>();
    const evaluation = evaluateAutocompleteStates(walkStates, context, editor);
    walkStates = evaluation.walkStates;
    _.each(walkStates, (ws) => {
      const terms = evaluation.stateTerms.get(ws);
      if (!terms) {
        return;
      }
      _.each(terms, function (term) {
        const termObj: ResultTerm = typeof term === 'string' ? { name: term } : term;

        // Add the term to the autoCompleteSet if it doesn't already exist
        if (!autoCompleteSet.has(termObj.name)) {
          autoCompleteSet.set(termObj.name, termObj);
        }
      });
    });
    context.autoCompleteSet = Array.from(autoCompleteSet.values());
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
      (ws: WalkingState) => (_.isNumber(ws.priority) ? ws.priority : Number.MAX_VALUE),
      (ws: WalkingState) => -ws.specificity,
    ]);
    wsToUse = _.find(walkStates, function (ws) {
      return _.isEmpty(ws.components);
    });

    if (!wsToUse && walkStates.length > 1 && !includeAutoComplete) {
      // eslint-disable-next-line no-console
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
