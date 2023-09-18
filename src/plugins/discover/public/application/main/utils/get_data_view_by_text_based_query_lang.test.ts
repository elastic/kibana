/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getDataViewByTextBasedQueryLang } from './get_data_view_by_text_based_query_lang';
import { dataViewAdHoc } from '../../../__mocks__/data_view_complex';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { discoverServiceMock } from '../../../__mocks__/services';

describe('getDataViewByTextBasedQueryLang', () => {
  discoverServiceMock.dataViews.create = jest.fn().mockReturnValue({
    ...dataViewMock,
    isPersisted: () => false,
    id: 'ad-hoc-id',
    title: 'test',
  });
  const services = discoverServiceMock;
  it('returns the current dataview if is adhoc and query has not changed', async () => {
    const query = { esql: 'from data-view-ad-hoc-title' };
    const dataView = await getDataViewByTextBasedQueryLang(query, dataViewAdHoc, services);
    expect(dataView).toStrictEqual(dataViewAdHoc);
  });

  it('creates an adhoc dataview if the current dataview is persistent and query has not changed', async () => {
    const query = { esql: 'from the-data-view-title' };
    const dataView = await getDataViewByTextBasedQueryLang(query, dataViewMock, services);
    expect(dataView.isPersisted()).toEqual(false);
    expect(dataView.timeFieldName).toBe('@timestamp');
  });

  it('creates an adhoc dataview if the current dataview is ad hoc and query has changed', async () => {
    discoverServiceMock.dataViews.create = jest.fn().mockReturnValue({
      ...dataViewAdHoc,
      isPersisted: () => false,
      id: 'ad-hoc-id-1',
      title: 'test-1',
      timeFieldName: undefined,
    });
    const query = { esql: 'from the-data-view-title' };
    const dataView = await getDataViewByTextBasedQueryLang(query, dataViewAdHoc, services);
    expect(dataView.isPersisted()).toEqual(false);
    expect(dataView.timeFieldName).toBeUndefined();
  });
});
