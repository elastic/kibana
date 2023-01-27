/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { changeDataView } from './change_data_view';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { createBrowserHistory } from 'history';
import { getDiscoverStateContainer } from '../../services/discover_state';
import { discoverServiceMock } from '../../../../__mocks__/services';
import type { DataView } from '@kbn/data-views-plugin/common';
import { dataViewComplexMock } from '../../../../__mocks__/data_view_complex';

const setupTestParams = (dataView: DataView | undefined) => {
  const savedSearch = savedSearchMock;
  const services = discoverServiceMock;
  const history = createBrowserHistory();
  const discoverState = getDiscoverStateContainer({
    savedSearch,
    services: discoverServiceMock,
    history,
  });
  discoverState.internalState.transitions.setDataView(savedSearch.searchSource.getField('index')!);
  services.dataViews.get = jest.fn(() => Promise.resolve(dataView as DataView));
  discoverState.setAppState = jest.fn();
  return { services, discoverState, setUrlTracking: jest.fn() };
};

describe('changeDataView', () => {
  it('should set the right app state when a valid data view to switch to is given', async () => {
    const params = setupTestParams(dataViewComplexMock as DataView);
    await changeDataView('data-view-with-various-field-types', params);
    expect(params.discoverState.setAppState).toHaveBeenCalledWith({
      columns: ['default_column'],
      index: 'data-view-with-various-field-types-id',
      sort: [['data', 'desc']],
    });
  });

  it('should not set the app state when an invalid data view to switch to is given', async () => {
    const params = setupTestParams(undefined);
    await changeDataView('data-view-with-various-field-types', params);
    expect(params.discoverState.setAppState).not.toHaveBeenCalled();
  });
});
