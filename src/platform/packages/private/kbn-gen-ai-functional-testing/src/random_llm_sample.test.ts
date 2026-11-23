/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  FTR_GEN_AI_LLM_SAMPLE_SIZE_ENV,
  parseFtrGenAiLlmSampleSize,
  takeRandomLlmSample,
} from './random_llm_sample';

const items = ['a', 'b', 'c', 'd'] as const;

describe('takeRandomLlmSample', () => {
  const originalEnv = process.env[FTR_GEN_AI_LLM_SAMPLE_SIZE_ENV];

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env[FTR_GEN_AI_LLM_SAMPLE_SIZE_ENV];
    } else {
      process.env[FTR_GEN_AI_LLM_SAMPLE_SIZE_ENV] = originalEnv;
    }
  });

  it('runs every LLM by default (no sampling)', () => {
    delete process.env[FTR_GEN_AI_LLM_SAMPLE_SIZE_ENV];
    expect(parseFtrGenAiLlmSampleSize()).toBe('all');
    expect(takeRandomLlmSample(items)).toEqual([...items]);
  });

  it('runs every LLM when set to "all"', () => {
    process.env[FTR_GEN_AI_LLM_SAMPLE_SIZE_ENV] = 'all';
    expect(takeRandomLlmSample(items)).toEqual([...items]);
  });

  it('caps the sample when set to a positive integer', () => {
    process.env[FTR_GEN_AI_LLM_SAMPLE_SIZE_ENV] = '2';
    const sample = takeRandomLlmSample(items);
    expect(sample).toHaveLength(2);
    for (const item of sample) {
      expect(items).toContain(item);
    }
  });

  it('returns the full list when the cap exceeds the list length', () => {
    process.env[FTR_GEN_AI_LLM_SAMPLE_SIZE_ENV] = '10';
    expect(takeRandomLlmSample(items)).toEqual([...items]);
  });

  it('throws on invalid values', () => {
    process.env[FTR_GEN_AI_LLM_SAMPLE_SIZE_ENV] = 'zero';
    expect(() => takeRandomLlmSample(items)).toThrow(
      `${FTR_GEN_AI_LLM_SAMPLE_SIZE_ENV} must be a positive integer or "all"`
    );
  });
});
