/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { FilterExpanded } from './filter_expanded';
import { mockUxSeries, mockAppDataView, mockUseValuesList, render } from '../../rtl_helpers';
import { USER_AGENT_NAME } from '../../configurations/constants/elasticsearch_fieldnames';

describe('FilterExpanded', function () {
  const filters = [{ field: USER_AGENT_NAME, values: ['Chrome'] }];

  const mockSeries = { ...mockUxSeries, filters };

  it('render', async () => {
    const initSeries = { filters };
    mockAppDataView();

    render(
      <FilterExpanded
        seriesId={0}
        series={mockSeries}
        label={'Browser Family'}
        field={USER_AGENT_NAME}
        baseFilters={[]}
      />,
      { initSeries }
    );

    await waitFor(() => {
      screen.getByText('Browser Family');
    });
  });

  it('should call go back on click', async function () {
    const initSeries = { filters };

    render(
      <FilterExpanded
        seriesId={0}
        series={mockSeries}
        label={'Browser Family'}
        field={USER_AGENT_NAME}
        baseFilters={[]}
      />,
      { initSeries }
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText('Browser Family'));
    });
  });

  it('calls useValuesList on load', async () => {
    const initSeries = { filters };

    const { spy } = mockUseValuesList([
      { label: 'Chrome', count: 10 },
      { label: 'Firefox', count: 5 },
    ]);

    render(
      <FilterExpanded
        seriesId={0}
        series={mockSeries}
        label={'Browser Family'}
        field={USER_AGENT_NAME}
        baseFilters={[]}
      />,
      { initSeries }
    );

    await waitFor(() => {
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toBeCalledWith(
        expect.objectContaining({
          time: { from: 'now-15m', to: 'now' },
          sourceField: USER_AGENT_NAME,
        })
      );
    });
  });

  it('filters display values', async () => {
    const initSeries = { filters };

    mockUseValuesList([
      { label: 'Chrome', count: 10 },
      { label: 'Firefox', count: 5 },
    ]);

    render(
      <FilterExpanded
        seriesId={0}
        series={mockUxSeries}
        label={'Browser Family'}
        field={USER_AGENT_NAME}
        baseFilters={[]}
      />,
      { initSeries }
    );

    await waitFor(() => {
      fireEvent.click(screen.getByText('Browser Family'));

      expect(screen.queryByText('Firefox')).toBeTruthy();

      fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'ch' } });

      expect(screen.queryByText('Firefox')).toBeFalsy();
      expect(screen.getByText('Chrome')).toBeTruthy();
    });
  });
});
