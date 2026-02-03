/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks } from '@kbn/esql-types';
import { isEqual, uniqWith } from 'lodash';
import type { ParameterHint } from '../../..';
import { walk } from '../../..';
import type { ESQLAstAllCommands } from '../../types';
import { getFunctionDefinition } from '../../commands/definitions/utils';
import { parametersFromHintsResolvers } from '../../commands/definitions/utils/autocomplete/parameters_from_hints';
import type { ICommandContext } from '../../commands/registry/types';
import { getPolicyHelper, getSourcesHelper } from '../shared/resources_helpers';

export const getCommandContext = async (
  command: ESQLAstAllCommands,
  queryString: string,
  callbacks?: ESQLCallbacks
): Promise<Partial<ICommandContext>> => {
  const getSources = getSourcesHelper(callbacks);
  const helpers = getPolicyHelper(callbacks);

  let context: Partial<ICommandContext> = {};

  switch (command.name) {
    case 'completion':
      context = {
        inferenceEndpoints:
          (await callbacks?.getInferenceEndpoints?.('completion'))?.inferenceEndpoints || [],
      };
      break;
    case 'rerank':
      context = {
        inferenceEndpoints:
          (await callbacks?.getInferenceEndpoints?.('rerank'))?.inferenceEndpoints || [],
      };
      break;
    case 'enrich':
      const policies = await helpers.getPolicies();
      const policiesMap = new Map(policies.map((policy) => [policy.name, policy]));
      context = {
        policies: policiesMap,
      };
      break;
    case 'from':
      const editorExtensions = (await callbacks?.getEditorExtensions?.(queryString)) ?? {
        recommendedQueries: [],
        recommendedFields: [],
      };
      context = {
        sources: await getSources(),
        editorExtensions,
      };
      break;
    case 'join':
      const joinSources = await callbacks?.getJoinIndices?.();
      context = {
        joinSources: joinSources?.indices || [],
        supportsControls: callbacks?.canSuggestVariables?.() ?? false,
      };
      break;
    case 'stats':
      const histogramBarTarget = (await callbacks?.getPreferences?.())?.histogramBarTarget || 50;
      context = {
        histogramBarTarget,
        supportsControls: callbacks?.canSuggestVariables?.() ?? false,
        variables: callbacks?.getVariables?.(),
      };
      break;
    case 'inline stats':
      context = {
        histogramBarTarget: (await callbacks?.getPreferences?.())?.histogramBarTarget || 50,
        supportsControls: callbacks?.canSuggestVariables?.() ?? false,
        variables: callbacks?.getVariables?.(),
      };
      break;
    case 'fork':
      const enrichPolicies = await helpers.getPolicies();
      context = {
        histogramBarTarget: (await callbacks?.getPreferences?.())?.histogramBarTarget || 50,
        joinSources: (await callbacks?.getJoinIndices?.())?.indices || [],
        supportsControls: callbacks?.canSuggestVariables?.() ?? false,
        policies: new Map(enrichPolicies.map((policy) => [policy.name, policy])),
        inferenceEndpoints:
          (await callbacks?.getInferenceEndpoints?.('completion'))?.inferenceEndpoints || [],
      };
      break;
    case 'ts':
      const timeseriesSources = await callbacks?.getTimeseriesIndices?.();
      context = {
        timeSeriesSources: timeseriesSources?.indices || [],
        sources: await getSources(),
        editorExtensions: (await callbacks?.getEditorExtensions?.(queryString)) ?? {
          recommendedQueries: [],
          recommendedFields: [],
        },
      };
      break;
    case 'promql':
      const promqlTimeseriesSources = await callbacks?.getTimeseriesIndices?.();
      context = {
        timeSeriesSources: promqlTimeseriesSources?.indices || [],
      };
      break;
    default:
      break;
  }

  // Check if the functions used within the command needs additional context
  context = await enhanceWithFunctionsContext(command, context, callbacks);

  return context;
};

/**
 *  Returns the context needed by the functions used within a command.
 */
export const enhanceWithFunctionsContext = async (
  command: ESQLAstAllCommands,
  context: Partial<ICommandContext>,
  callbacks?: ESQLCallbacks
): Promise<Partial<ICommandContext>> => {
  const hints: ParameterHint[] = [];
  const newContext: Partial<ICommandContext> = Object.assign({}, context);

  // Gathers all hints from all functions used within the command
  walk(command, {
    visitFunction: (funcNode) => {
      const functionDefinition = getFunctionDefinition(funcNode.name);

      if (functionDefinition) {
        for (const signature of functionDefinition.signatures) {
          for (const param of signature.params) {
            if (param.hint) {
              hints.push(param.hint);
            }
          }
        }
      }
    },
  });

  // Remove duplicate hints
  const uniqueHints = uniqWith(
    hints,
    (a, b) => a.entityType === b.entityType && isEqual(a.constraints, b.constraints)
  );

  // If the hint needs new data to build the suggestions, we add that data to the context
  for (const hint of uniqueHints) {
    const parameterHandler = parametersFromHintsResolvers[hint.entityType];
    if (parameterHandler?.contextResolver) {
      const resolvedContext = await parameterHandler.contextResolver(
        hint,
        context,
        callbacks ?? {}
      );
      Object.assign(newContext, resolvedContext);
    }
  }

  return newContext;
};
