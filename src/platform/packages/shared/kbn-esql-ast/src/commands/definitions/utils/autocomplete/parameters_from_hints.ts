/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import type { ESQLCallbacks } from '@kbn/esql-types';
import type { ParameterHint, ParameterHintEntityType } from '../../..';
import type { ISuggestionItem } from '../../../registry/types';
import type { ExpressionContext } from './expressions/types';
import { createInferenceEndpointToCompletionItem } from './helpers';

/**
 * For some parameters, ES gives as hints about the nature of it, that we use to provide
 * custom autocompletion handlers.
 *
 * For each hint we need to provide:
 * - a suggestionResolver to generate the autocomplettion items to shown for that param.
 * - optionally, a contextResolver that populates the context with the data needed by the suggestionResolver.
 */
export const parametersFromHintsMap: Record<
  ParameterHintEntityType,
  {
    suggestionResolver: (hint: ParameterHint, ctx: ExpressionContext) => Promise<ISuggestionItem[]>;
    contextResolver?: (
      hint: ParameterHint,
      callbacks: ESQLCallbacks
    ) => Promise<Record<string, unknown>>;
  }
> = {
  ['inference_endpoint']: {
    suggestionResolver: inferenceEndpointSuggestionResolver,
    contextResolver: inferenceEndpointContextResolver,
  },
};

// -------- INFERENCE ENDPOINT -------- //
async function inferenceEndpointContextResolver(
  hint: ParameterHint,
  callbacks: ESQLCallbacks
): Promise<Record<string, unknown>> {
  if (hint.constraints?.task_type) {
    const inferenceEnpoints =
      (await callbacks?.getInferenceEndpoints?.(hint.constraints?.task_type as InferenceTaskType))
        ?.inferenceEndpoints || [];

    return {
      inferenceEndpoints: inferenceEnpoints,
    };
  }
  return {};
}
async function inferenceEndpointSuggestionResolver(
  hint: ParameterHint,
  ctx: ExpressionContext
): Promise<ISuggestionItem[]> {
  if (hint.constraints?.task_type) {
    const inferenceEnpoints =
      ctx.context?.inferenceEndpoints?.filter((endpoint) => {
        return endpoint.task_type === hint.constraints?.task_type;
      }) ?? [];

    return inferenceEnpoints.map(createInferenceEndpointToCompletionItem).map((item) => {
      return {
        ...item,
        detail: i18n.translate('kbn-esql-ast.esql.definitions.inferenceEndpointInFunction', {
          defaultMessage: 'Inference endpoint used for this function',
        }),
        text: `"${item.text}"`,
      };
    });
  }
  return [];
}
