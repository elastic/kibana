/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISearchStart } from '../../../search';
import { loadEsqlQueryProfile } from './load_esql_query_profile';

describe('loadEsqlQueryProfile results', () => {
  const rawResponse = {
    profile: { query: { took_millis: 5 }, drivers: [] },
    columns: [{ name: 'k', type: 'keyword' }],
    values: [['a'], ['b']],
  };
  const search = {
    esql: jest.fn(async () => ({ rawResponse })),
  } as unknown as Pick<ISearchStart, 'esql'>;
  const load = (keepResults: () => boolean) =>
    loadEsqlQueryProfile({
      search,
      requestJson: { query: 'FROM logs' },
      abortSignal: new AbortController().signal,
      keepResults,
    });

  it('does not keep the results when they are not asked for', async () => {
    expect((await load(() => false)).readResults).toBeUndefined();
  });

  it('summarizes the results only when asked to, and only once', async () => {
    const { readResults } = await load(() => true);

    const first = readResults?.();
    expect(first).toMatchObject({ rowCount: 2, columns: [{ name: 'k', type: 'keyword' }] });
    expect(readResults?.()).toBe(first);
  });
});
