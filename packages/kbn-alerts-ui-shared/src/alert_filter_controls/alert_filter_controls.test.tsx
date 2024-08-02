/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AlertFilterControls, AlertFilterControlsProps } from './alert_filter_controls';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { HttpStart } from '@kbn/core-http-browser';
import { NotificationsStart } from '@kbn/core-notifications-browser';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DEFAULT_CONTROLS } from './constants';
import { useAlertsDataView } from '../common/hooks/use_alerts_data_view';

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
  http: {} as unknown as HttpStart,
  notifications: {
    toasts: {
      addDanger: jest.fn(),
    },
  } as unknown as NotificationsStart,
  dataViews: {
    create: jest.fn((dataViewSpec) => ({ ...dataViewSpec })),
    clearInstanceCache: jest.fn(),
  } as unknown as DataViewsPublicPluginStart,
  storage: class {
    get = jest.fn();
    set = jest.fn();
  } as unknown as AlertFilterControlsProps['services']['storage'],
};

const setFilters = jest.fn();

const ControlGroupRenderer = (() => (
  <span />
)) as unknown as AlertFilterControlsProps['ControlGroupRenderer'];

describe('AlertFilterControls', () => {
  const props: AlertFilterControlsProps = {
    featureIds: [AlertConsumers.STACK_ALERTS],
    defaultControls: DEFAULT_CONTROLS,
    dataViewSpec: {
      id: 'alerts-filters-dv',
    },
    onFiltersChange: setFilters,
    services: mockServices,
    chainingSystem: 'HIERARCHICAL',
    ControlGroupRenderer,
  };

  it('renders', () => {
    const result = render(<AlertFilterControls {...props} />);

    expect(result.container).toMatchSnapshot();
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
