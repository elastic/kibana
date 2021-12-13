/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getIndices,
  getIndicesViaSearch,
  responseToItemArray,
  dedupeMatchedItems,
} from './get_indices';
import { httpServiceMock } from '../../../../core/public/mocks';
import { ResolveIndexResponseItemIndexAttrs, MatchedItem } from '../types';
import { Observable } from 'rxjs';

export const successfulResolveResponse = {
  indices: [
    {
      name: 'remoteCluster1:bar-01',
      attributes: ['open'],
    },
  ],
  aliases: [
    {
      name: 'f-alias',
      indices: ['freeze-index', 'my-index'],
    },
  ],
  data_streams: [
    {
      name: 'foo',
      backing_indices: ['foo-000001'],
      timestamp_field: '@timestamp',
    },
  ],
};

const successfulSearchResponse = {
  isPartial: false,
  isRunning: false,
  rawResponse: {
    aggregations: {
      indices: {
        buckets: [{ key: 'kibana_sample_data_ecommerce' }, { key: '.kibana_1' }],
      },
    },
  },
};

const partialSearchResponse = {
  isPartial: true,
  isRunning: true,
  rawResponse: {
    hits: {
      total: 2,
      hits: [],
    },
  },
};

const errorSearchResponse = {
  isPartial: true,
  isRunning: false,
};

const isRollupIndex = () => false;
const getTags = () => [];
const searchClient = () =>
  new Observable((observer) => {
    observer.next(successfulSearchResponse);
    observer.complete();
  }) as any;

const http = httpServiceMock.createStartContract();
http.get.mockResolvedValue(successfulResolveResponse);

describe('getIndices', () => {
  it('should work in a basic case', async () => {
    const uncalledSearchClient = jest.fn();
    const result = await getIndices({
      http,
      pattern: 'kibana',
      searchClient: uncalledSearchClient,
      isRollupIndex,
    });
    expect(http.get).toHaveBeenCalled();
    expect(uncalledSearchClient).not.toHaveBeenCalled();
    expect(result.length).toBe(3);
    expect(result[0].name).toBe('f-alias');
    expect(result[1].name).toBe('foo');
  });

  it('should make two calls in cross cluser case', async () => {
    http.get.mockResolvedValue(successfulResolveResponse);
    const result = await getIndices({ http, pattern: '*:kibana', searchClient, isRollupIndex });

    expect(http.get).toHaveBeenCalled();
    expect(result.length).toBe(4);
    expect(result[0].name).toBe('f-alias');
    expect(result[1].name).toBe('foo');
    expect(result[2].name).toBe('kibana_sample_data_ecommerce');
    expect(result[3].name).toBe('remoteCluster1:bar-01');
  });

  it('should ignore ccs query-all', async () => {
    expect((await getIndices({ http, pattern: '*:', searchClient, isRollupIndex })).length).toBe(0);
  });

  it('should ignore a single comma', async () => {
    expect((await getIndices({ http, pattern: ',', searchClient, isRollupIndex })).length).toBe(0);
    expect((await getIndices({ http, pattern: ',*', searchClient, isRollupIndex })).length).toBe(0);
    expect(
      (await getIndices({ http, pattern: ',foobar', searchClient, isRollupIndex })).length
    ).toBe(0);
  });

  it('should work with partial responses', async () => {
    const searchClientPartialResponse = () =>
      new Observable((observer) => {
        observer.next(partialSearchResponse);
        observer.next(successfulSearchResponse);
        observer.complete();
      }) as any;
    const result = await getIndices({
      http,
      pattern: '*:kibana',
      searchClient: searchClientPartialResponse,
      isRollupIndex,
    });
    expect(result.length).toBe(4);
  });

  it('response object to item array', () => {
    const result = {
      indices: [
        {
          name: 'test_index',
        },
        {
          name: 'frozen_index',
          attributes: ['frozen' as ResolveIndexResponseItemIndexAttrs],
        },
      ],
      aliases: [
        {
          name: 'test_alias',
          indices: [],
        },
      ],
      data_streams: [
        {
          name: 'test_data_stream',
          backing_indices: [],
          timestamp_field: 'test_timestamp_field',
        },
      ],
    };
    expect(responseToItemArray(result, getTags)).toMatchSnapshot();
    expect(responseToItemArray({}, getTags)).toEqual([]);
  });

  it('matched items are deduped', () => {
    const setA = [{ name: 'a' }, { name: 'b' }] as MatchedItem[];
    const setB = [{ name: 'b' }, { name: 'c' }] as MatchedItem[];
    expect(dedupeMatchedItems(setA, setB)).toHaveLength(3);
  });

  describe('errors', () => {
    it('should handle thrown errors gracefully', async () => {
      http.get.mockImplementationOnce(() => {
        throw new Error('Test error');
      });
      const result = await getIndices({ http, pattern: 'kibana', searchClient, isRollupIndex });
      expect(result.length).toBe(0);
    });

    it('getIndicesViaSearch should handle error responses gracefully', async () => {
      const searchClientErrorResponse = () =>
        new Observable((observer) => {
          observer.next(errorSearchResponse);
          observer.complete();
        }) as any;
      const result = await getIndicesViaSearch({
        pattern: '*:kibana',
        searchClient: searchClientErrorResponse,
        showAllIndices: false,
        isRollupIndex,
      });
      expect(result.length).toBe(0);
    });
  });
});
