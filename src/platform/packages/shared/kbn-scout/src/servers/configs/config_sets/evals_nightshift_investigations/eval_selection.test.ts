/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveNightshiftEvalSelection } from './eval_selection';

describe('resolveNightshiftEvalSelection', () => {
  it('runs every eval with the sandbox when unset and credentials are present', () => {
    expect(resolveNightshiftEvalSelection({ SANDBOX_API_KEY: 'key' })).toEqual({
      selection: 'all',
      needsSandbox: true,
      fellBackToSmoke: false,
    });
  });

  it('falls back to smoke without the sandbox when unset and credentials are missing', () => {
    expect(resolveNightshiftEvalSelection({})).toEqual({
      selection: 'synthetic-smoke',
      needsSandbox: false,
      fellBackToSmoke: true,
    });
  });

  it('treats an empty value as unset', () => {
    expect(resolveNightshiftEvalSelection({ NIGHTSHIFT_DATASETS: '' }).selection).toBe(
      'synthetic-smoke'
    );
  });

  it.each([
    ['synthetic-smoke', false],
    ['trace-only', true],
    ['all', true],
  ] as const)('honours an explicit %s regardless of credentials', (selection, needsSandbox) => {
    for (const env of [{}, { SANDBOX_API_KEY: 'key' }]) {
      expect(resolveNightshiftEvalSelection({ ...env, NIGHTSHIFT_DATASETS: selection })).toEqual({
        selection,
        needsSandbox,
        fellBackToSmoke: false,
      });
    }
  });

  it('rejects unknown selections', () => {
    expect(() => resolveNightshiftEvalSelection({ NIGHTSHIFT_DATASETS: 'bogus' })).toThrow(
      'Unknown NIGHTSHIFT_DATASETS: bogus'
    );
  });
});
