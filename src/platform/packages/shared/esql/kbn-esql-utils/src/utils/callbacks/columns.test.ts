/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { ESQLVariableType, SOURCE_INFO_ROUTE } from '@kbn/esql-types';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { clearESQLSourceInfoCache, getESQLSourceInfo } from '../get_source_info';
import { getEsqlSourceColumns } from './columns';

const createHttp = () =>
  ({
    post: jest.fn().mockResolvedValue({
      columns: [
        { name: 'host', esType: 'keyword' },
        { name: 'bytes', esType: 'unsupported', originalTypes: ['long', 'keyword'] },
      ],
    }),
  } as unknown as HttpStart & { post: jest.Mock });

const postedBody = (http: { post: jest.Mock }) => JSON.parse(http.post.mock.calls[0][1].body);

describe('getEsqlSourceColumns', () => {
  beforeEach(() => clearESQLSourceInfoCache());

  it('returns the columns with their conflicts', async () => {
    const http = createHttp();

    const columns = await getEsqlSourceColumns({ esqlQuery: 'FROM logs-*', http });

    expect(http.post).toHaveBeenCalledWith(SOURCE_INFO_ROUTE, expect.anything());
    expect(columns).toEqual([
      {
        name: 'host',
        type: 'keyword',
        hasConflict: false,
        originalTypes: undefined,
        userDefined: false,
      },
      {
        name: 'bytes',
        type: 'unsupported',
        hasConflict: true,
        originalTypes: ['long', 'keyword'],
        userDefined: false,
      },
    ]);
  });

  it('shares the source info request with other callers of the same query', async () => {
    const http = createHttp();

    await getESQLSourceInfo({ query: 'FROM logs-*', http, projectRouting: '_alias:_origin' });
    await getEsqlSourceColumns({
      esqlQuery: 'FROM logs-*',
      http,
      projectRouting: '_alias:_origin',
    });

    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('only sends the variables the query uses', async () => {
    const http = createHttp();
    const variables: ESQLControlVariable[] = [
      { key: 'host', value: 'web-01', type: ESQLVariableType.VALUES },
      { key: 'unused', value: 'x', type: ESQLVariableType.VALUES },
    ];

    await getEsqlSourceColumns({
      esqlQuery: 'FROM logs-* | WHERE host == ?host',
      http,
      variables,
    });

    expect(postedBody(http).esqlVariables).toEqual([variables[0]]);
  });

  it('sends no variables for a query without any', async () => {
    const http = createHttp();

    await getEsqlSourceColumns({
      esqlQuery: 'FROM logs-*',
      http,
      variables: [{ key: 'host', value: 'web-01', type: ESQLVariableType.VALUES }],
    });

    expect(postedBody(http).esqlVariables).toBeUndefined();
  });

  it('returns no columns when the request fails', async () => {
    const http = createHttp();
    http.post.mockRejectedValue(new Error('boom'));

    expect(await getEsqlSourceColumns({ esqlQuery: 'FROM logs-*', http })).toEqual([]);
  });

  it('cancels the request when its signal aborts', async () => {
    let requestSignal: AbortSignal | undefined;
    const http = {
      post: jest.fn((_path: string, { signal }: { signal: AbortSignal }) => {
        requestSignal = signal;
        return new Promise((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(new Error('aborted')))
        );
      }),
    } as unknown as HttpStart;
    const controller = new AbortController();

    const pending = getEsqlSourceColumns({
      esqlQuery: 'FROM logs-*',
      http,
      signal: controller.signal,
    });
    controller.abort();

    expect(await pending).toEqual([]);
    expect(requestSignal?.aborted).toBe(true);
  });

  it('returns no columns without a query', async () => {
    const http = createHttp();

    expect(await getEsqlSourceColumns({ esqlQuery: '', http })).toEqual([]);
    expect(http.post).not.toHaveBeenCalled();
  });
});
