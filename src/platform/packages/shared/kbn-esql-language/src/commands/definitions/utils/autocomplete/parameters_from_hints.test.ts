/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ICommandContext } from '../../../registry/types';
import type { ParameterHint } from '../../types';
import { parametersFromHintsResolvers } from './parameters_from_hints';
import type { ESQLCallbacks, InferenceEndpointAutocompleteItem } from '@kbn/esql-types';

describe('Parameters from hints handlers', () => {
  describe('inference_endpoint hint', () => {
    const inferenceEndpoints: InferenceEndpointAutocompleteItem[] = [
      {
        inference_id: 'text_embedding_endpoint',
        task_type: 'text_embedding',
      },
    ];

    const mockCallbacks: ESQLCallbacks = {
      getInferenceEndpoints: jest.fn(async () => ({ inferenceEndpoints })),
    };

    const hint: ParameterHint = {
      entityType: 'inference_endpoint' as const,
      constraints: {
        task_type: 'text_embedding',
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return inference endpoint suggestions filtered by task_type constraint', async () => {
      const suggestions = await getSuggestionsForHint(hint, undefined, mockCallbacks);
      expect(suggestions).toEqual(['text_embedding_endpoint']);
    });

    it('should not refetch inference endpoints if the context already has endpoints for the task type', async () => {
      const suggestions = await getSuggestionsForHint(
        hint,
        {
          columns: new Map(),
          inferenceEndpoints,
        },
        mockCallbacks
      );

      expect(suggestions).toEqual(['text_embedding_endpoint']);
      expect(mockCallbacks.getInferenceEndpoints).not.toHaveBeenCalled();
    });

    it('should fetch inference endpoints if the context already has endpoints, but not of the requested task type, also, it should preserve both', async () => {
      const otherInferenceEndpoints: InferenceEndpointAutocompleteItem[] = [
        {
          inference_id: 'completion_endpoint',
          task_type: 'completion',
        },
      ];

      const suggestions = await getSuggestionsForHint(
        hint,
        {
          columns: new Map(),
          inferenceEndpoints: otherInferenceEndpoints,
        },
        mockCallbacks
      );

      expect(suggestions).toEqual(['text_embedding_endpoint']);
      expect(mockCallbacks.getInferenceEndpoints).toHaveBeenCalledWith('text_embedding');
    });
  });
});

/**
 * Calculates which would be the suggestions for a given parameter hint
 * given certain callbacks and former context.
 */
export async function getSuggestionsForHint(
  hint: ParameterHint,
  formerContext?: ICommandContext,
  callbacks: ESQLCallbacks = {}
) {
  const resolversEntry = parametersFromHintsResolvers[hint.entityType];

  if (!resolversEntry) {
    throw new Error(`No resolvers found for hint type: ${hint.entityType}`);
  }

  const { suggestionResolver, contextResolver } = resolversEntry;
  if (!suggestionResolver) {
    throw new Error(`No suggestionResolver found for hint type: ${hint.entityType}`);
  }

  // Build the context using the context resolver if available
  let context: ICommandContext = formerContext ?? { columns: new Map() };
  if (contextResolver) {
    context = {
      ...context,
      ...((await contextResolver?.(hint, context, callbacks)) ?? {}),
    };
  }

  const suggestions = suggestionResolver(hint, context).map((s) => s.label);

  return suggestions;
}
