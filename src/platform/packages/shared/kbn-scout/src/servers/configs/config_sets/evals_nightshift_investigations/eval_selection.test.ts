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
  ] as const)('honours an explicit %s when credentials are present', (selection, needsSandbox) => {
    expect(
      resolveNightshiftEvalSelection({ ...WITH_SANDBOX, NIGHTSHIFT_DATASETS: selection })
    ).toMatchObject({ selection, needsSandbox, fellBackToSmoke: false });
  });

  it('honours an explicit synthetic-smoke without credentials', () => {
    expect(resolveNightshiftEvalSelection({ NIGHTSHIFT_DATASETS: 'synthetic-smoke' })).toEqual({
      selection: 'synthetic-smoke',
      needsSandbox: false,
      startInvestigationServer: false,
      fellBackToSmoke: false,
    });
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

  it.each(['trace-only', 'all'])(
    'rejects an explicit %s without credentials, even when Scout would be reused',
    (selection) => {
      // The Playwright config resolves the selection on every run, so this fails fast instead of
      // running investigation specs against a reused smoke-only server.
      expect(() => resolveNightshiftEvalSelection({ NIGHTSHIFT_DATASETS: selection })).toThrow(
        `NIGHTSHIFT_DATASETS=${selection} runs investigation evals, but SANDBOX_API_KEY is required`
      );
    }
  );

  it('rejects unknown selections', () => {
    expect(() => resolveNightshiftEvalSelection({ NIGHTSHIFT_DATASETS: 'bogus' })).toThrow(
      'Unknown NIGHTSHIFT_DATASETS: bogus'
    );
  });
});
