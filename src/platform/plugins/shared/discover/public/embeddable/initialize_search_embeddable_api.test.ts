/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import { generateInlineDataViewId } from '../../common/session/inline_data_view';
import { createDiscoverServicesMock } from '../__mocks__/services';
import { initializeSearchEmbeddableApi } from './initialize_search_embeddable_api';

describe('Discover embeddable inline Data View IDs', () => {
  const cleanups: Array<() => void> = [];

  afterEach(() => {
    cleanups.forEach((cleanup) => cleanup());
    cleanups.length = 0;
  });

  const initialize = async (serializedSearchSource?: SerializedSearchSourceFields) => {
    const services = createDiscoverServicesMock();
    const createSearchSource = jest
      .spyOn(services.data.search.searchSource, 'create')
      .mockImplementation(async () => createSearchSourceMock());

    const result = await initializeSearchEmbeddableApi({
      initialState: { serializedSearchSource },
      discoverServices: services,
      dataLoading$: new BehaviorSubject<boolean | undefined>(false),
    });

    cleanups.push(result.cleanup);
    return { ...result, createSearchSource };
  };

  it('assigns a missing inline ID without changing filters or the input', async () => {
    const searchSource = {
      index: { title: 'logs-*', timeFieldName: '@timestamp' },
      filter: [
        { meta: {}, query: { match_phrase: { bytes: 100 } } },
        { meta: { index: 'other-view' }, query: { match_phrase: { bytes: 200 } } },
        { meta: { index: 'old-inline-id' }, query: { match_phrase: { bytes: 300 } } },
      ],
    };
    const original = cloneDeep(searchSource);
    const expected = {
      ...original,
      index: { ...original.index, id: generateInlineDataViewId(original.index) },
    };
    const { createSearchSource, reinitializeState } = await initialize(searchSource);

    expect(createSearchSource).toHaveBeenNthCalledWith(1, expected);
    expect(searchSource).toEqual(original);

    createSearchSource.mockClear();
    await reinitializeState({ serializedSearchSource: searchSource });

    expect(createSearchSource).toHaveBeenNthCalledWith(1, expected);
    expect(searchSource).toEqual(original);
  });

  it.each<[string, SerializedSearchSourceFields | undefined]>([
    [
      'an existing inline ID',
      {
        index: { title: 'logs-*', id: 'legacy-inline-id' },
        filter: [{ meta: { index: 'legacy-inline-id' }, query: { match_phrase: { bytes: 100 } } }],
      },
    ],
    ['a saved Data View reference', { index: 'saved-data-view' }],
    ['an ES|QL query', { index: { title: 'logs-*' }, query: { esql: 'FROM logs-*' } }],
    ['an ES|QL Data View', { index: { title: 'logs-*', type: ESQL_TYPE } }],
    ['a spec without a title', { index: {} }],
    ['no Data View', {}],
    ['no SearchSource', undefined],
  ])('passes through %s unchanged', async (_description, searchSource) => {
    const original = cloneDeep(searchSource);
    const { createSearchSource } = await initialize(searchSource);

    expect(createSearchSource).toHaveBeenNthCalledWith(1, original);
    expect(searchSource).toEqual(original);
  });
});
