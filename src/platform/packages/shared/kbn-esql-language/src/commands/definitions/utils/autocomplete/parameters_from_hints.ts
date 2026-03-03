/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { uniqBy } from 'lodash';
import type { ParameterHint, ParameterHintEntityType } from '../../..';
import type { ICommandContext, ISuggestionItem } from '../../../registry/types';
import { createInferenceEndpointToCompletionItem } from './helpers';

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
      (await callbacks?.getInferenceEndpoints?.(hint.constraints?.task_type as InferenceTaskType))
        ?.inferenceEndpoints || [];

    return {
      inferenceEndpoints: uniqBy(
        [...inferenceEndpointsFromContext, ...inferenceEnpoints],
        'inference_id'
      ),
    };
  }
  return {};
}
