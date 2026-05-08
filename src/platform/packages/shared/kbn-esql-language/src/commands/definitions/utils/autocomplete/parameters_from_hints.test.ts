/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ICommandContext } from '../../../registry/types';
import { Location } from '../../../registry/types';
import type { ParameterHint } from '../../types';
import { kindBasedResolvers, parametersFromHintsResolvers } from './parameters_from_hints';
import type { ExpressionContext } from './expressions/types';
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

  describe('aggregation kind hint', () => {
    const buildCtx = (overrides: Partial<ExpressionContext> = {}): ExpressionContext =>
      ({
        query: '',
        cursorPosition: 0,
        innerText: '',
        location: Location.STATS,
        command: {} as ExpressionContext['command'],
        options: {},
        ...overrides,
      } as ExpressionContext);

    const resolver = kindBasedResolvers.aggregation!;

    it('returns AGG functions for the STATS location and excludes scalar/grouping functions', () => {
      const labels = resolver(buildCtx()).map((s) => s.label);

      // Sanity: known aggregation functions appear
      expect(labels).toContain('AVG');
      expect(labels).toContain('SUM');
      expect(labels).toContain('MAX');

      // Negative: scalar (ROUND, CONCAT) and grouping (BUCKET) functions are excluded
      expect(labels).not.toContain('ROUND');
      expect(labels).not.toContain('CONCAT');
      expect(labels).not.toContain('BUCKET');
    });

    it('respects functionsToIgnore (e.g. self-recursion guard)', () => {
      const labels = resolver(
        buildCtx({
          options: { functionsToIgnore: { names: ['avg'] } },
        })
      ).map((s) => s.label);

      expect(labels).not.toContain('AVG');
      // Other aggregations still appear
      expect(labels).toContain('SUM');
    });

    it('filters by paramDefinitions return types so non-matching aggs are excluded', () => {
      // Numeric-only param
      const numericLabels = resolver(
        buildCtx({
          options: {
            functionParameterContext: {
              paramDefinitions: [{ name: 'aggregation', type: 'double' }],
              hasMoreMandatoryArgs: false,
              currentParameterIndex: 0,
              signatures: [],
            },
          },
        })
      ).map((s) => s.label);

      // AVG returns double → kept
      expect(numericLabels).toContain('AVG');
      // ST_CENTROID_AGG returns geo_point → dropped
      expect(numericLabels).not.toContain('ST_CENTROID_AGG');
    });

    it('appends a trailing comma to the inserted text when more mandatory args follow', () => {
      const item = resolver(
        buildCtx({
          options: {
            functionParameterContext: {
              paramDefinitions: [{ name: 'aggregation', type: 'double' }],
              hasMoreMandatoryArgs: true,
              currentParameterIndex: 0,
              signatures: [],
            },
          },
        })
      ).find((s) => s.label === 'AVG');

      expect(item).toBeDefined();
      expect(item!.text.endsWith(',')).toBe(true);
    });

    it('does not append a trailing comma when no more mandatory args follow', () => {
      const item = resolver(
        buildCtx({
          options: {
            functionParameterContext: {
              paramDefinitions: [{ name: 'aggregation', type: 'double' }],
              hasMoreMandatoryArgs: false,
              currentParameterIndex: 0,
              signatures: [],
            },
          },
        })
      ).find((s) => s.label === 'AVG');

      expect(item).toBeDefined();
      expect(item!.text.endsWith(',')).toBe(false);
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
  if (hint.entityType === undefined) {
    throw new Error('Hint entityType is required for resolver lookup');
  }

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
