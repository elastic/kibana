/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AlertFilterControls, AlertFilterControlsProps } from './alert_filter_controls';
import { DEFAULT_CONTROLS } from './constants';
import { useAlertsDataView } from '../common/hooks/use_alerts_data_view';
import { FilterGroup } from './filter_group';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';

jest.mock('./filter_group');
jest.mocked(FilterGroup).mockReturnValue(<span data-test-subj="filter-group" />);

jest.mock('../common/hooks/use_alerts_data_view');
jest.mocked(useAlertsDataView).mockReturnValue({
  isLoading: false,
  dataView: {
    title: '.alerts-*',
    fields: [
      {
        name: 'event.action',
        type: 'string',
        aggregatable: true,
        searchable: true,
      },
    ],
  },
});

const mockServices = {
  http: httpServiceMock.createStartContract(),
  notifications: notificationServiceMock.createStartContract(),
  dataViews: dataViewPluginMocks.createStartContract(),
  storage: class {
    get = jest.fn();
    set = jest.fn();
  } as unknown as AlertFilterControlsProps['services']['storage'],
};
mockServices.dataViews.clearInstanceCache = jest.fn().mockResolvedValue(undefined);

const setFilters = jest.fn();

const ControlGroupRenderer = (() => (
  <span />
)) as unknown as AlertFilterControlsProps['ControlGroupRenderer'];

describe('AlertFilterControls', () => {
  const props: AlertFilterControlsProps = {
    ruleTypeIds: ['.es-query'],
    defaultControls: DEFAULT_CONTROLS,
    dataViewSpec: {
      id: 'alerts-filters-dv',
    },
    onFiltersChange: setFilters,
    services: mockServices,
    chainingSystem: 'HIERARCHICAL',
    ControlGroupRenderer,
  };

  it('renders the filter group', async () => {
    render(<AlertFilterControls {...props} />);

    expect(await screen.findByTestId('filter-group')).toBeInTheDocument();
  });

  it('creates a data view if a spec with an id is provided', () => {
    render(<AlertFilterControls {...props} />);

    expect(mockServices.dataViews.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'alerts-filters-dv',
      })
    );
  });
});
