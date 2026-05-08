/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks } from '@kbn/esql-types';
import { uniqBy } from 'lodash';
import type { ParameterHint, ParameterHintEntityType } from '../../..';
import type { ICommandContext, ISuggestionItem } from '../../../registry/types';
import { FunctionDefinitionTypes } from '../../types';
import { filterFunctionDefinitions, getAllFunctions, getFunctionSuggestion } from '../functions';
import { createInferenceEndpointToCompletionItem, withAutoSuggest } from './helpers';
import type { ExpressionContext } from './expressions/types';

type SuggestionResolver = (hint: ParameterHint, ctx?: ICommandContext) => ISuggestionItem[];

type ContextResolver = (
  hint: ParameterHint,
  ctx: Partial<ICommandContext>,
  callbacks: ESQLCallbacks
) => Promise<Record<string, unknown>>;

/**
 * For some parameters, ES gives us hints about the nature of it, that we use to provide
 * custom autocompletion handlers.
 *
 * For each hint we need to provide:
 * - a suggestionResolver to generate the autocompletion items for this param.
 * - optionally, a contextResolver that populates the context with the data needed by the suggestionResolver.
 *
 * Important!
 * Be mindful while implementing context resolvers, context is shared by the command and all functions used within it.
 * If the data you need is already present, don't overwrite it, prefer merging it.
 */
export const parametersFromHintsResolvers: Partial<
  Record<
    ParameterHintEntityType,
    {
      suggestionResolver: SuggestionResolver;
      contextResolver?: ContextResolver;
    }
  >
> = {
  ['inference_endpoint']: {
    suggestionResolver: inferenceEndpointSuggestionResolver,
    contextResolver: inferenceEndpointContextResolver,
  },
};

type KindSuggestionResolver = (ctx: ExpressionContext) => ISuggestionItem[];

/**
 * Resolvers keyed by `hint.kind`. Returning items from one of these makes the
 * suggestion exclusive — the composite path (fields + all functions) is skipped.
 * Add a new entry to support a new kind; nothing else needs to change.
 */
export const kindBasedResolvers: Partial<Record<string, KindSuggestionResolver>> = {
  aggregation: aggregationKindResolver,
};

// -------- AGGREGATION KIND HINT -------- //
function aggregationKindResolver(ctx: ExpressionContext): ISuggestionItem[] {
  const fnParamCtx = ctx.options.functionParameterContext;
  const ignored = ctx.options.functionsToIgnore?.names ?? [];

  // Filter by the param's accepted return types so e.g. SPARKLINE's numeric first arg
  // doesn't surface aggregations that return non-numeric types (ST_CENTROID_AGG, etc.).
  // When no param context is available, accept any return type.
  const paramTypes = fnParamCtx?.paramDefinitions.map((p) => p.type as string) ?? [];
  const returnTypes = paramTypes.length > 0 ? paramTypes : ['any'];

  // Append a trailing comma when more mandatory args follow this one,
  // matching the comma-handling done elsewhere in the suggestion path.
  const shouldAddComma = fnParamCtx?.hasMoreMandatoryArgs ?? false;

  return filterFunctionDefinitions(
    getAllFunctions({
      type: [FunctionDefinitionTypes.AGG, FunctionDefinitionTypes.TIME_SERIES_AGG],
      includeOperators: false,
    }),
    { location: ctx.location, ignored, returnTypes },
    ctx.callbacks?.hasMinimumLicenseRequired,
    ctx.context?.activeProduct
  ).map((fn) => {
    const item = withAutoSuggest(getFunctionSuggestion(fn));
    if (shouldAddComma) {
      item.text += ',';
    }
    return item;
  });
}

// -------- INFERENCE ENDPOINT HINT -------- //
function inferenceEndpointSuggestionResolver(
  hint: ParameterHint,
  ctx?: ICommandContext
): ISuggestionItem[] {
  if (hint.constraints?.task_type) {
    const inferenceEnpoints =
      ctx?.inferenceEndpoints?.filter((endpoint) => {
        return endpoint.task_type === hint.constraints?.task_type;
      }) ?? [];

    return inferenceEnpoints.map((inferenceEndpoint) => {
      const item = createInferenceEndpointToCompletionItem(inferenceEndpoint);
      return {
        ...item,
        detail: '',
        text: `"${item.text}"`,
      };
    });
  }
  return [];
}

async function inferenceEndpointContextResolver(
  hint: ParameterHint,
  ctx: Partial<ICommandContext>,
  callbacks: ESQLCallbacks
): Promise<Record<string, unknown>> {
  if (hint.constraints?.task_type) {
    const inferenceEndpointsFromContext = ctx.inferenceEndpoints ?? [];

    // If the context already has an endpoint for the task type, we don't need to fetch them again
    if (
      inferenceEndpointsFromContext.find(
        (endpoint) => endpoint.task_type === hint.constraints?.task_type
      )
    ) {
      return {};
    }

    const inferenceEnpoints =
      (await callbacks?.getInferenceEndpoints?.(hint.constraints?.task_type))?.inferenceEndpoints ||
      [];

    return {
      inferenceEndpoints: uniqBy(
        [...inferenceEndpointsFromContext, ...inferenceEnpoints],
        'inference_id'
      ),
    };
  }
  return {};
}
