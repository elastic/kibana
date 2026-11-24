/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ACTION_DESCRIPTIONS } from './descriptions';
import { TrendVisionOne } from './trend_vision_one';
import {
  API,
  ctx,
  ok,
  parseInput,
  request,
  resetMocksAroundEachTest,
  run,
  sent,
} from './test_helpers';

resetMocksAroundEachTest();

describe('TrendAI Vision One listEndpoints input guards', () => {
  it('refuses endpointName and filter values with characters above U+00FF before any request', async () => {
    for (const input of [{ endpointName: 'PC1東京' }, { filter: "endpointName eq 'PC1東京'" }]) {
      const parsed = parseInput('listEndpoints', input);
      expect(parsed.success).toBe(false);
      expect(JSON.stringify(parsed.error)).toContain('characters above U+00FF');
    }
    // The guard in the header builder also holds when the schema is bypassed.
    await expect(
      TrendVisionOne.actions.listEndpoints.handler(ctx, { endpointName: 'PC1東京' })
    ).rejects.toThrow('characters above U+00FF');
    expect(request).not.toHaveBeenCalled();
  });

  it('sends endpointName values up to U+00FF unchanged', async () => {
    request.mockResolvedValueOnce(ok({ items: [] }));
    await run('listEndpoints', { endpointName: 'café-ÿ' });
    expect(sent().headers['TMV1-Filter']).toBe("endpointName eq 'café-ÿ'");
  });

  it.each(['?top=1000', '?skipToken=1&top=201', '?top=500'])(
    'refuses the nextLink %s with a page size above 200 before any request',
    async (query) => {
      await expect(
        run('listEndpoints', { nextLink: `${API}/endpointSecurity/endpoints${query}` })
      ).rejects.toThrow('nextLink asks for a page size');
      expect(request).not.toHaveBeenCalled();
    }
  );

  it.each(['', '?skipToken=2', '?top=200&skipToken=2', '?top=10'])(
    'reads the nextLink %j (no top, or top within 200)',
    async (query) => {
      request.mockResolvedValueOnce(ok({ items: [] }));
      await run('listEndpoints', { nextLink: `${API}/endpointSecurity/endpoints${query}` });
      expect(sent().url).toBe(`${API}/endpointSecurity/endpoints${query}`);
    }
  );

  it('refuses a nextLink with a user name or password before any request', async () => {
    await expect(
      run('listEndpoints', {
        nextLink: 'https://u:p@api.in.xdr.trendmicro.com/v3.0/endpointSecurity/endpoints?top=10',
      })
    ).rejects.toThrow('nextLink must not contain a user name or password');
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    ['the caller nextLink', `${API}/endpointSecurity/endpoints?top=10&skipToken=abc`],
    [
      'the caller nextLink in another form',
      '/v3.0/endpointSecurity/endpoints?skipToken=abc&top=10#x',
    ],
  ])('returns no nextLink when the product answers %s again', async (_what, returned) => {
    request.mockResolvedValueOnce(ok({ totalCount: 5, count: 1, items: [{}], nextLink: returned }));
    const result = await run('listEndpoints', {
      nextLink: `${API}/endpointSecurity/endpoints?top=10&skipToken=abc`,
    });
    expect(result).toMatchObject({ count: 1, nextLink: null });
  });

  it('returns no nextLink when the product links back to the first page', async () => {
    request.mockResolvedValueOnce(
      ok({ items: [{}], nextLink: `${API}/endpointSecurity/endpoints?top=50` })
    );
    await expect(run('listEndpoints', { top: 50 })).resolves.toMatchObject({ nextLink: null });
  });

  it('returns a different nextLink of the product unchanged', async () => {
    const next = `${API}/endpointSecurity/endpoints?top=10&skipToken=def`;
    request.mockResolvedValueOnce(ok({ items: [{}], nextLink: next }));
    await expect(
      run('listEndpoints', { nextLink: `${API}/endpointSecurity/endpoints?top=10&skipToken=abc` })
    ).resolves.toMatchObject({ nextLink: next });
  });
});

describe('TrendAI Vision One listObservedAttackTechniques input guards', () => {
  it('refuses a filter with characters above U+00FF before any request', async () => {
    const parsed = parseInput('listObservedAttackTechniques', {
      filter: "endpointName eq 'PC1東京'",
    });
    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error)).toContain('characters above U+00FF');
    await expect(
      TrendVisionOne.actions.listObservedAttackTechniques.handler(ctx, {
        filter: "endpointName eq 'PC1東京'",
      })
    ).rejects.toThrow('characters above U+00FF');
    expect(request).not.toHaveBeenCalled();
  });

  it.each(['?top=101', '?top=1000', '?skipToken=1&top=200'])(
    'refuses the nextLink %s with a page size above 100 before any request',
    async (query) => {
      await expect(
        run('listObservedAttackTechniques', { nextLink: `${API}/oat/detections${query}` })
      ).rejects.toThrow('nextLink asks for a page size');
      expect(request).not.toHaveBeenCalled();
    }
  );

  it.each(['', '?skipToken=2', '?top=100&skipToken=2', '?top=50'])(
    'reads the nextLink %j (no top, or top within 100)',
    async (query) => {
      request.mockResolvedValueOnce(ok({ items: [] }));
      await run('listObservedAttackTechniques', { nextLink: `${API}/oat/detections${query}` });
      expect(sent().url).toBe(`${API}/oat/detections${query}`);
    }
  );

  it('refuses a nextLink with a user name or password before any request', async () => {
    await expect(
      run('listObservedAttackTechniques', {
        nextLink: 'https://u:p@api.in.xdr.trendmicro.com/v3.0/oat/detections?skipToken=1',
      })
    ).rejects.toThrow('nextLink must not contain a user name or password');
    expect(request).not.toHaveBeenCalled();
  });

  it('returns no nextLink when the product answers the caller nextLink again', async () => {
    const link = `${API}/oat/detections?top=50&skipToken=abc`;
    request.mockResolvedValueOnce(
      ok({
        totalCount: 9,
        count: 1,
        items: [{ id: 'oat-1' }],
        nextLink: `${API}/oat/detections?skipToken=abc&top=50`,
      })
    );
    await expect(run('listObservedAttackTechniques', { nextLink: link })).resolves.toMatchObject({
      count: 1,
      nextLink: null,
    });
  });

  it('returns no nextLink when the product links back to the first page', async () => {
    request.mockResolvedValueOnce(ok({ items: [{}], nextLink: `${API}/oat/detections?top=100` }));
    await expect(run('listObservedAttackTechniques', { top: 100 })).resolves.toMatchObject({
      nextLink: null,
    });
  });

  it('tells that an ingestion range alone still covers only the last hour of detections', () => {
    expect(ACTION_DESCRIPTIONS.listObservedAttackTechniques).toContain(
      'An ingestion range alone still returns only the last hour of detections; give a detection range to read more.'
    );
  });

  it.each([
    ['detectedStartDateTime', 'detectedEndDateTime'],
    ['ingestedStartDateTime', 'ingestedEndDateTime'],
  ])('rejects impossible %s values at the schema and accepts valid edges', (start, end) => {
    for (const value of ['2026-02-31T25:61:61Z', '2026-02-29T00:00:00Z', '2026-01-01T24:00:00Z']) {
      const parsed = parseInput('listObservedAttackTechniques', { [start]: value, [end]: value });
      expect(parsed.success).toBe(false);
      expect(JSON.stringify(parsed.error)).toContain('Use a real date and time');
    }
    for (const value of ['2024-02-29T23:59:59Z', '2026-12-31T00:00:00Z']) {
      expect(
        parseInput('listObservedAttackTechniques', { [start]: value, [end]: value }).success
      ).toBe(true);
    }
  });
});
