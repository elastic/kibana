/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sampleSize } from 'lodash';

/**
 * Max number of LLMs (connectors / EIS models) to run per FTR suite when unset.
 * Override with {@link FTR_GEN_AI_LLM_SAMPLE_SIZE_ENV}.
 */
export const DEFAULT_FTR_GEN_AI_LLM_SAMPLE_SIZE = 3;

/**
 * Set to a positive integer to cap how many LLMs are exercised in each FTR run.
 * Set to `all` to run every discovered LLM (slower; useful for local debugging).
 */
export const FTR_GEN_AI_LLM_SAMPLE_SIZE_ENV = 'FTR_GEN_AI_LLM_SAMPLE_SIZE';

export type FtrGenAiLlmSampleSize = number | 'all';

export function parseFtrGenAiLlmSampleSize(): FtrGenAiLlmSampleSize {
  const raw = process.env[FTR_GEN_AI_LLM_SAMPLE_SIZE_ENV];
  if (raw === undefined || raw === '') {
    return DEFAULT_FTR_GEN_AI_LLM_SAMPLE_SIZE;
  }
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === 'all') {
    return 'all';
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(
      `${FTR_GEN_AI_LLM_SAMPLE_SIZE_ENV} must be a positive integer or "all", got: ${JSON.stringify(
        raw
      )}`
    );
  }
  return n;
}

/**
 * Returns a random subset of `items` when the configured sample size is smaller
 * than the list length; otherwise returns the full list (copy).
 */
export function takeRandomLlmSample<T>(items: readonly T[]): T[] {
  const mode = parseFtrGenAiLlmSampleSize();
  if (mode === 'all' || items.length <= mode) {
    return [...items];
  }
  return sampleSize([...items], mode);
}
