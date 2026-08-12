/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { normalizeStepAi, stepAiToTokenUsage } from './normalize_step_ai';

describe('normalizeStepAi', () => {
  it('returns undefined when nothing is available', () => {
    expect(normalizeStepAi({})).toBeUndefined();
  });

  it('prefers top-level usage', () => {
    expect(
      normalizeStepAi({
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      })
    ).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      model: undefined,
      connectorId: undefined,
      timeToFirstTokenMs: undefined,
      callCount: undefined,
    });
  });

  it('enriches model and connector from output.metadata', () => {
    expect(
      normalizeStepAi({
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        output: {
          metadata: {
            usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2, connectorId: 'c1' },
            model: 'gpt-4.1',
            timeToFirstTokenMs: 120,
          },
        },
      })
    ).toMatchObject({
      model: 'gpt-4.1',
      connectorId: 'c1',
      timeToFirstTokenMs: 120,
      totalTokens: 2,
    });
  });

  it('reads snake_case usage from output when usage prop is absent', () => {
    expect(
      normalizeStepAi({
        output: {
          usage: { input_tokens: 3, output_tokens: 4 },
          model: 'claude',
        },
      })
    ).toMatchObject({
      inputTokens: 3,
      outputTokens: 4,
      totalTokens: 7,
      model: 'claude',
    });
  });

  it('keeps model-only metadata without inventing a token breakdown', () => {
    expect(normalizeStepAi({ output: { model: 'gpt-4o' } })).toEqual({
      inputTokens: undefined,
      outputTokens: undefined,
      totalTokens: undefined,
      model: 'gpt-4o',
      connectorId: undefined,
      timeToFirstTokenMs: undefined,
      callCount: undefined,
    });
  });
});

describe('stepAiToTokenUsage', () => {
  it('returns undefined without token fields', () => {
    expect(stepAiToTokenUsage({ model: 'x' })).toBeUndefined();
  });

  it('fills missing total from input+output', () => {
    expect(stepAiToTokenUsage({ inputTokens: 2, outputTokens: 3 })).toEqual({
      inputTokens: 2,
      outputTokens: 3,
      totalTokens: 5,
    });
  });
});
