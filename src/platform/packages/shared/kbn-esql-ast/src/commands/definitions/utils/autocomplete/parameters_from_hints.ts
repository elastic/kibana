/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "async Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import { i18n } from '@kbn/i18n';
import type { ParameterHint, ParameterHintEntityType } from '../../..';
import type { ISuggestionItem } from '../../../registry/types';
import type { ExpressionContext } from './expressions/types';
import { createInferenceEndpointToCompletionItem } from './helpers';

const inferenceEndpointHandler = async (hint: ParameterHint, ctx: ExpressionContext) => {
  if (hint.constraints?.task_type) {
    const inferenceEnpoints =
      (
        await ctx.callbacks?.getInferenceEndpoints?.(
          hint.constraints?.task_type as InferenceTaskType
        )
      )?.inferenceEndpoints || [];

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
};

/**
 * For some parameters, ES gives as hints about the nature of it, that we use to provide
 * custom autocompletion handlers.
 */
export const parametersFromHintsMap: Record<
  ParameterHintEntityType,
  (hint: ParameterHint, ctx: ExpressionContext) => Promise<ISuggestionItem[]>
> = {
  ['inference_endpoint']: inferenceEndpointHandler,
};
