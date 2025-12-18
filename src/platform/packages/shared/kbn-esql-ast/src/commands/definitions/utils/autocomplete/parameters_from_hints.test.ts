/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uniq } from 'lodash';
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

    it('should return inference endpoint suggestions filtered by task_type constraint', () => {
      testHandlersForHint(hint, ['text_embedding_endpoint'], undefined, mockCallbacks);
    });

    it('should not refetch inference endpoints if the context already has endpoints for the task type', () => {
      testHandlersForHint(
        hint,
        ['text_embedding_endpoint'],
        {
          columns: new Map(),
          inferenceEndpoints,
        },
        mockCallbacks
      );

      expect(mockCallbacks.getInferenceEndpoints).not.toHaveBeenCalled();
    });

    it('should fetch inference endpoints if the context already has endpoints, but not of the requested task type, also, it should preserve both', () => {
      const otherInferenceEndpoints: InferenceEndpointAutocompleteItem[] = [
        {
          inference_id: 'completion_endpoint',
          task_type: 'completion',
        },
      ];

      testHandlersForHint(
        hint,
        ['text_embedding_endpoint'],
        {
          columns: new Map(),
          inferenceEndpoints: otherInferenceEndpoints,
        },
        mockCallbacks
      );

      expect(mockCallbacks.getInferenceEndpoints).toHaveBeenCalledWith('text_embedding');
    });
  });
});

/**
 * Tests that the suggestion handler returns the expected suggestions for a given hint,
 * executing the context resolver if available to build the context.
 */
async function testHandlersForHint(
  hint: ParameterHint,
  expectedSuggestions: string[],
  formerContext?: ICommandContext,
  callbacks: ESQLCallbacks = {}
) {
  const resolversEntry = parametersFromHintsResolvers[hint.entityType];

  if (!resolversEntry) {
    return;
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

  expect(uniq(suggestions).sort()).toEqual(uniq(expectedSuggestions).sort());
}
