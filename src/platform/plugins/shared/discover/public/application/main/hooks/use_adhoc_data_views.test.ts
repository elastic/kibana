/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { METRIC_TYPE } from '@kbn/analytics';
import type { DataSource } from '@kbn/data-source';
import { DataViewSource } from '@kbn/data-source';
import { createMockEsqlSource } from '@kbn/data-source/src/__mocks__/esql_source.mock';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { useAdHocDataViews } from './use_adhoc_data_views';
import { ADHOC_DATA_VIEW_RENDER_EVENT } from '../../../constants';
import { dataViewAdHoc } from '../../../__mocks__/data_view_complex';
import { createDiscoverServicesMock } from '../../../__mocks__/services';
import { useCurrentDataSource } from '../state_management/redux';

const mockServices = createDiscoverServicesMock();

jest.mock('../state_management/redux', () => ({
  useCurrentDataSource: jest.fn(),
}));

jest.mock('../../../hooks/use_discover_services', () => ({
  useDiscoverServices: () => mockServices,
}));

jest.mock('./use_filters_validation', () => ({
  useFiltersValidation: jest.fn(),
}));

const renderWithDataSource = (dataSource: DataSource) => {
  jest.mocked(useCurrentDataSource).mockReturnValue(dataSource);
  renderHook(() => useAdHocDataViews());
};

describe('useAdHocDataViews', () => {
  beforeEach(() => {
    mockServices.trackUiMetric = jest.fn();
  });

  it('tracks the ad hoc data view metric for an ad hoc data view in classic mode', () => {
    renderWithDataSource(new DataViewSource(dataViewAdHoc));
    expect(mockServices.trackUiMetric).toHaveBeenCalledWith(
      METRIC_TYPE.COUNT,
      ADHOC_DATA_VIEW_RENDER_EVENT
    );
  });

  it('does not track the ad hoc data view metric for a persisted data view', () => {
    renderWithDataSource(new DataViewSource(dataViewMock));
    expect(mockServices.trackUiMetric).not.toHaveBeenCalled();
  });

  it('does not track the ad hoc data view metric in ES|QL mode', () => {
    renderWithDataSource(createMockEsqlSource());
    expect(mockServices.trackUiMetric).not.toHaveBeenCalled();
  });
});
