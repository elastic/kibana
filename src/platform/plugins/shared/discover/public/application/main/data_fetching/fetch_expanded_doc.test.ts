/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { createDiscoverServicesMock } from '../../../__mocks__/services';
import { fetchExpandedDoc } from './fetch_expanded_doc';

const ref = { id: 'doc-1', index: '.ds-logs-nginx-2024.01.01-000001' };

const setup = (response: IKibanaSearchResponse) => {
  const services = createDiscoverServicesMock();

  jest.mocked(services.data.search.search).mockImplementation(() => of(response));

  return {
    data: services.data,
    getSearchParams: () => jest.mocked(services.data.search.search).mock.calls[0][0],
  };
};

describe('fetchExpandedDoc', () => {
  describe('data view mode', () => {
    it('builds a record from the matching hit', async () => {
      const { data } = setup({
        rawResponse: { hits: { hits: [{ _id: ref.id, _index: ref.index, _source: { a: 1 } }] } },
      });

      const record = await fetchExpandedDoc({
        ref,
        dataView: dataViewMock,
        esqlQueryText: undefined,
        data,
        abortSignal: new AbortController().signal,
      });

      expect(record?.id).toBe(`${ref.index}::${ref.id}::`);
      expect(record?.raw).toEqual({ _id: ref.id, _index: ref.index, _source: { a: 1 } });
      expect(record?.flattened).toEqual({ _index: ref.index, _score: undefined, a: 1 });
    });

    it('returns undefined when the document no longer exists', async () => {
      const { data } = setup({ rawResponse: { hits: { hits: [] } } });

      const record = await fetchExpandedDoc({
        ref,
        dataView: dataViewMock,
        esqlQueryText: undefined,
        data,
        abortSignal: new AbortController().signal,
      });

      expect(record).toBeUndefined();
    });

    it('routes the request to the document shard', async () => {
      const { data, getSearchParams } = setup({ rawResponse: { hits: { hits: [] } } });

      await fetchExpandedDoc({
        ref: { ...ref, routing: 'route-1' },
        dataView: dataViewMock,
        esqlQueryText: undefined,
        data,
        abortSignal: new AbortController().signal,
      });

      expect(getSearchParams().params.routing).toBe('route-1');
    });
  });

  describe('ES|QL mode', () => {
    const esqlResponse: IKibanaSearchResponse = {
      rawResponse: {
        columns: [
          { name: '_index', type: 'keyword' },
          { name: '_id', type: 'keyword' },
          { name: 'message', type: 'keyword' },
        ],
        values: [[ref.index, ref.id, 'hello']],
      },
    };

    it('preserves the current query pipeline when fetching the document', async () => {
      const { data, getSearchParams } = setup(esqlResponse);

      await fetchExpandedDoc({
        ref,
        dataView: dataViewMock,
        esqlQueryText: 'FROM logs-* METADATA _id, _index | EVAL derived = message',
        data,
        abortSignal: new AbortController().signal,
      });

      expect(getSearchParams().params.query).toBe(
        `FROM logs-* METADATA _id, _index | WHERE _index == "${ref.index}" AND _id == "${ref.id}" | EVAL derived = message | LIMIT 1`
      );
    });

    it('filters a TS query when fetching the document', async () => {
      const { data, getSearchParams } = setup(esqlResponse);

      await fetchExpandedDoc({
        ref,
        dataView: dataViewMock,
        esqlQueryText: 'TS metrics-* METADATA _id, _index',
        data,
        abortSignal: new AbortController().signal,
      });

      expect(getSearchParams().params.query).toBe(
        `TS metrics-* METADATA _id, _index | WHERE _index == "${ref.index}" AND _id == "${ref.id}" | LIMIT 1`
      );
    });

    it('escapes document identifiers when building the query', async () => {
      const { data, getSearchParams } = setup(esqlResponse);

      await fetchExpandedDoc({
        ref: { id: 'doc-"1\\path', index: 'logs-"quoted' },
        dataView: dataViewMock,
        esqlQueryText: 'FROM logs-* METADATA _id, _index',
        data,
        abortSignal: new AbortController().signal,
      });

      expect(getSearchParams().params.query).toBe(
        'FROM logs-* METADATA _id, _index | WHERE _index == "logs-\\"quoted" AND _id == "doc-\\"1\\\\path" | LIMIT 1'
      );
    });

    it('builds a record shaped like the ones the main ES|QL search produces', async () => {
      const { data } = setup(esqlResponse);

      const record = await fetchExpandedDoc({
        ref,
        dataView: dataViewMock,
        esqlQueryText: 'FROM logs-* METADATA _id, _index',
        data,
        abortSignal: new AbortController().signal,
      });

      const row = { _index: ref.index, _id: ref.id, message: 'hello' };

      expect(record).toEqual({ id: `${ref.index}::${ref.id}::`, raw: row, flattened: row });
    });

    it('returns undefined when the document no longer exists', async () => {
      const { data } = setup({ rawResponse: { columns: [], values: [] } });

      const record = await fetchExpandedDoc({
        ref,
        dataView: dataViewMock,
        esqlQueryText: 'FROM logs-* METADATA _id, _index',
        data,
        abortSignal: new AbortController().signal,
      });

      expect(record).toBeUndefined();
    });
  });
});
