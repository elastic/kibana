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
  AutocompleteTermDefinition,
} from './components/autocomplete_component';
import type { AutoCompleteContext, ResultTerm } from './types';
import { asArray } from '../utils/array_utils';

declare global {
  interface Window {
    engine_trace?: boolean;
  }
}

type AutocompleteContext = AutoCompleteContext;

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
  priority: number | undefined;

  constructor(
    parentName: string | undefined,
    components: AutocompleteComponent[],
    contextExtensionList: Array<Record<string, unknown>>,
    depth?: number,
    priority?: number
  ) {
    this.parentName = parentName;
    this.components = components;
    this.contextExtensionList = contextExtensionList;
    this.depth = depth || 0;
    this.priority = priority;
  }
}

export function walkTokenPath(
  tokenPath: Array<string | string[]>,
  walkingStates: WalkingState[],
  context: AutocompleteContext,
  editor: unknown
): WalkingState[] {
  if (!tokenPath || tokenPath.length === 0) {
    return walkingStates;
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
        let next: AutocompleteComponent[] = [];
        if (result.next) {
          next = asArray(result.next);
        }

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

        nextWalkingStates.push(
          new WalkingState(component.name, next, extensionList, ws.depth + 1, priority)
        );
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
    editor
  );
  if (includeAutoComplete) {
    const autoCompleteSet = new Map<ResultTerm['name'], ResultTerm>();
    _.each(walkStates, function (ws) {
      const contextForState = passThroughContext(context, ws.contextExtensionList);
      _.each(ws.components, function (component) {
        const terms = component.getTerms(contextForState, editor);
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
    });
    context.autoCompleteSet = Array.from(autoCompleteSet.values());
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
