/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { ISearchGeneric } from '@kbn/search-types';

import { createGetFullDataRange, getDataViewTimeRange } from './get_data_view_time_range';

const createDataView = (overrides: Partial<DataView> = {}) =>
  ({
    timeFieldName: '@timestamp',
    getIndexPattern: () => 'logs-*',
    getRuntimeMappings: () => ({}),
    ...overrides,
  } as DataView);

const createSearch = (aggregations?: object) =>
  jest.fn(() =>
    of({ rawResponse: { aggregations } })
  ) as unknown as jest.MockedFunction<ISearchGeneric>;

describe('getDataViewTimeRange', () => {
  it('queries min and max of the time field and returns ISO bounds', async () => {
    const search = createSearch({
      earliest: { value: Date.UTC(2024, 0, 1) },
      latest: { value: Date.UTC(2024, 5, 30, 12) },
    });
    const signal = new AbortController().signal;

    const range = await getDataViewTimeRange({ dataView: createDataView(), search, signal });

    expect(range).toEqual({ start: '2024-01-01T00:00:00.000Z', end: '2024-06-30T12:00:00.000Z' });
    expect(search).toHaveBeenCalledWith(
      {
        params: {
          index: 'logs-*',
          size: 0,
          track_total_hits: false,
          aggs: {
            earliest: { min: { field: '@timestamp' } },
            latest: { max: { field: '@timestamp' } },
          },
        },
      },
      { abortSignal: signal }
    );
  });

  it('includes runtime mappings when the data view has them', async () => {
    const runtimeMappings = { ts: { type: 'date' as const } };
    const search = createSearch({ earliest: { value: 0 }, latest: { value: 1 } });

    await getDataViewTimeRange({
      dataView: createDataView({ timeFieldName: 'ts', getRuntimeMappings: () => runtimeMappings }),
      search,
    });

    expect(search.mock.calls[0][0].params).toEqual(
      expect.objectContaining({ runtime_mappings: runtimeMappings })
    );
  });

  it('forwards project routing to the search options', async () => {
    const search = createSearch({ earliest: { value: 0 }, latest: { value: 1 } });

    await getDataViewTimeRange({
      dataView: createDataView(),
      search,
      projectRouting: '_alias:_origin',
    });

    expect(search).toHaveBeenCalledWith(expect.anything(), {
      abortSignal: undefined,
      projectRouting: '_alias:_origin',
    });
  });

  it('returns null when there is no data', async () => {
    const search = createSearch({ earliest: { value: null }, latest: { value: null } });

    expect(await getDataViewTimeRange({ dataView: createDataView(), search })).toBeNull();
  });

  it('returns null without searching when the data view is not time based', async () => {
    const search = createSearch();

    const range = await getDataViewTimeRange({
      dataView: createDataView({ timeFieldName: undefined }),
      search,
    });

    expect(range).toBeNull();
    expect(search).not.toHaveBeenCalled();
  });
});

describe('createGetFullDataRange', () => {
  it('returns undefined when there is no time based data view', () => {
    const search = createSearch();

    expect(createGetFullDataRange({ search })).toBeUndefined();
    expect(
      createGetFullDataRange({ dataView: createDataView({ timeFieldName: undefined }), search })
    ).toBeUndefined();
  });

  it('returns a callback that forwards the abort signal and project routing', async () => {
    const search = createSearch({ earliest: { value: 0 }, latest: { value: 1 } });
    const signal = new AbortController().signal;

    await createGetFullDataRange({
      dataView: createDataView(),
      search,
      projectRouting: '_alias:_origin',
    })?.(signal);

    expect(search).toHaveBeenCalledWith(expect.anything(), {
      abortSignal: signal,
      projectRouting: '_alias:_origin',
    });
  });
});
