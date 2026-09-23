/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveNightshiftEvalSelection } from './eval_selection';

const WITH_SANDBOX = { SANDBOX_API_KEY: 'key' };

describe('resolveNightshiftEvalSelection', () => {
  it('runs every eval on the investigation server when unset and credentials are present', () => {
    expect(resolveNightshiftEvalSelection(WITH_SANDBOX)).toEqual({
      selection: 'all',
      needsSandbox: true,
      startInvestigationServer: true,
      fellBackToSmoke: false,
    });
  });

  it('falls back to smoke on the plain server when unset and credentials are missing', () => {
    expect(resolveNightshiftEvalSelection({})).toEqual({
      selection: 'synthetic-smoke',
      needsSandbox: false,
      startInvestigationServer: false,
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
    for (const env of [{}, WITH_SANDBOX]) {
      expect(
        resolveNightshiftEvalSelection({ ...env, NIGHTSHIFT_DATASETS: selection })
      ).toMatchObject({ selection, needsSandbox, fellBackToSmoke: false });
    }
  });

  it('chooses the server from credentials, not the selection, so switching selections needs no restart', () => {
    // Scout is reused across `evals start` runs unless SANDBOX_* changes; NIGHTSHIFT_DATASETS is not
    // tracked. Smoke with credentials must therefore still start the investigation server.
    for (const selection of ['synthetic-smoke', 'trace-only', 'all']) {
      expect(
        resolveNightshiftEvalSelection({ ...WITH_SANDBOX, NIGHTSHIFT_DATASETS: selection })
          .startInvestigationServer
      ).toBe(true);
    }
    expect(
      resolveNightshiftEvalSelection({ NIGHTSHIFT_DATASETS: 'synthetic-smoke' })
        .startInvestigationServer
    ).toBe(false);
  });

  it('still starts the investigation server for an explicit investigation selection without credentials, to fail fast', () => {
    expect(
      resolveNightshiftEvalSelection({ NIGHTSHIFT_DATASETS: 'trace-only' }).startInvestigationServer
    ).toBe(true);
  });

  it('rejects unknown selections', () => {
    expect(() => resolveNightshiftEvalSelection({ NIGHTSHIFT_DATASETS: 'bogus' })).toThrow(
      'Unknown NIGHTSHIFT_DATASETS: bogus'
    );
  });
});
