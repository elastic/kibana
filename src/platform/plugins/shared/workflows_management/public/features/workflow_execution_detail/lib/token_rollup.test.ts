/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { rollupStepAiList, rollupTokenUsage, tokenRollupToUsage } from './token_rollup';

describe('rollupTokenUsage', () => {
  it('returns empty for a node with no AI data', () => {
    expect(rollupTokenUsage({})).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      callCount: 0,
      hasTokens: false,
    });
  });

  it('rolls up a leaf AI node', () => {
    expect(
      rollupTokenUsage({
        ai: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      })
    ).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      callCount: 1,
      hasTokens: true,
    });
  });

  it('sums children and ignores empty siblings', () => {
    const result = rollupTokenUsage({
      children: [
        { ai: { inputTokens: 10, outputTokens: 5, totalTokens: 15 } },
        {},
        { ai: { inputTokens: 20, outputTokens: 10, totalTokens: 30 } },
      ],
    });
    expect(result).toEqual({
      inputTokens: 30,
      outputTokens: 15,
      totalTokens: 45,
      callCount: 2,
      hasTokens: true,
    });
  });

  it('nests foreach-style trees', () => {
    const result = rollupTokenUsage({
      children: [
        {
          children: [
            { ai: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } },
            { ai: { inputTokens: 2, outputTokens: 2, totalTokens: 4 } },
          ],
        },
      ],
    });
    expect(result.totalTokens).toBe(6);
    expect(result.callCount).toBe(2);
  });

  it('respects explicit callCount on multi-call leaves', () => {
    expect(
      rollupTokenUsage({
        ai: { totalTokens: 100, inputTokens: 60, outputTokens: 40, callCount: 3 },
      }).callCount
    ).toBe(3);
  });

  it('tolerates total-only partial data', () => {
    expect(rollupTokenUsage({ ai: { totalTokens: 42 } })).toMatchObject({
      totalTokens: 42,
      inputTokens: 0,
      outputTokens: 0,
      hasTokens: true,
      callCount: 1,
    });
  });

  it('treats zero-total AI leaves as empty so control-flow parents get no badge value', () => {
    const result = rollupTokenUsage({
      children: [{ ai: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } }, {}],
    });
    expect(result).toEqual({
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      callCount: 0,
      hasTokens: false,
    });
    expect(tokenRollupToUsage(result)).toBeUndefined();
  });
});

describe('rollupStepAiList', () => {
  it('filters undefined entries', () => {
    expect(
      rollupStepAiList([undefined, { totalTokens: 10, inputTokens: 6, outputTokens: 4 }, undefined])
        .totalTokens
    ).toBe(10);
  });
});
