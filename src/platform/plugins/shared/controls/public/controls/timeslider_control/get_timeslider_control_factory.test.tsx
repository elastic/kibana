/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';

import { EuiThemeProvider } from '@elastic/eui';
import dateMath from '@kbn/datemath';
import { TimeRange } from '@kbn/es-query';
import { fireEvent, render as rtlRender } from '@testing-library/react';

import { dataService } from '../../services/kibana_services';
import { getMockedControlGroupApi, getMockedFinalizeApi } from '../mocks/control_mocks';
import { getTimesliderControlFactory } from './get_timeslider_control_factory';

const render = (ui: React.ReactElement) => {
  return rtlRender(ui, { wrapper: EuiThemeProvider });
};

describe('TimesliderControlApi', () => {
  const uuid = 'myControl1';

  const dashboardApi = {
    timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
  };
  const controlGroupApi = getMockedControlGroupApi(dashboardApi);
  const factory = getTimesliderControlFactory();
  const finalizeApi = getMockedFinalizeApi(uuid, factory, controlGroupApi);

  dataService.query.timefilter.timefilter.calculateBounds = (timeRange: TimeRange) => {
    const now = new Date();
    return {
      min: dateMath.parse(timeRange.from, { forceNow: now }),
      max: dateMath.parse(timeRange.to, { roundUp: true, forceNow: now }),
    };
  };

  beforeEach(() => {
    dashboardApi.timeRange$.next({
      from: '2024-06-09T00:00:00.000Z',
      to: '2024-06-10T00:00:00.000Z',
    });
  });

  test('Should set timeslice to undefined when state does not provide percentage of timeRange', async () => {
    const { api } = await factory.buildControl({
      initialState: {},
      finalizeApi,
      uuid,
      controlGroupApi,
    });
    expect(api.timeslice$.value).toBe(undefined);
  });

  test('Should set timeslice to values within time range when state provides percentage of timeRange', async () => {
    const { api } = await factory.buildControl({
      initialState: {
        timesliceStartAsPercentageOfTimeRange: 0.25,
        timesliceEndAsPercentageOfTimeRange: 0.5,
      },
      finalizeApi,
      uuid,
      controlGroupApi,
    });

    expect(new Date(api.timeslice$.value![0]).toISOString()).toEqual('2024-06-09T06:00:00.000Z');
    expect(new Date(api.timeslice$.value![1]).toISOString()).toEqual('2024-06-09T12:00:00.000Z');
  });

  test('Should update timeslice when time range changes', async () => {
    const { api } = await factory.buildControl({
      initialState: {
        timesliceStartAsPercentageOfTimeRange: 0.25,
        timesliceEndAsPercentageOfTimeRange: 0.5,
      },
      finalizeApi,
      uuid,
      controlGroupApi,
    });

    // change time range to single hour
    dashboardApi.timeRange$.next({
      from: '2024-06-08T00:00:00.000Z',
      to: '2024-06-08T01:00:00.000Z',
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    // update time slice to same percentage in new hour interval
    expect(new Date(api.timeslice$.value![0]).toISOString()).toEqual('2024-06-08T00:15:00.000Z');
    expect(new Date(api.timeslice$.value![1]).toISOString()).toEqual('2024-06-08T00:30:00.000Z');
  });

  test('Clicking previous button should advance timeslice backward', async () => {
    const { api } = await factory.buildControl({
      initialState: {
        timesliceStartAsPercentageOfTimeRange: 0.25,
        timesliceEndAsPercentageOfTimeRange: 0.5,
      },
      finalizeApi,
      uuid,
      controlGroupApi,
    });
    if (!api.CustomPrependComponent) {
      throw new Error('API does not return CustomPrependComponent');
    }
    const { findByTestId } = render(<api.CustomPrependComponent />);
    fireEvent.click(await findByTestId('timeSlider-previousTimeWindow'));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(new Date(api.timeslice$.value![0]).toISOString()).toEqual('2024-06-09T00:00:00.000Z');
    expect(new Date(api.timeslice$.value![1]).toISOString()).toEqual('2024-06-09T06:00:00.000Z');
  });

  test('Clicking previous button should wrap when time range start is reached', async () => {
    const { api } = await factory.buildControl({
      initialState: {
        timesliceStartAsPercentageOfTimeRange: 0.25,
        timesliceEndAsPercentageOfTimeRange: 0.5,
      },
      finalizeApi,
      uuid,
      controlGroupApi,
    });
    if (!api.CustomPrependComponent) {
      throw new Error('API does not return CustomPrependComponent');
    }
    const { findByTestId } = render(<api.CustomPrependComponent />);
    fireEvent.click(await findByTestId('timeSlider-previousTimeWindow'));
    fireEvent.click(await findByTestId('timeSlider-previousTimeWindow'));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(new Date(api.timeslice$.value![0]).toISOString()).toEqual('2024-06-09T18:00:00.000Z');
    expect(new Date(api.timeslice$.value![1]).toISOString()).toEqual('2024-06-10T00:00:00.000Z');
  });

  test('Clicking next button should advance timeslice forward', async () => {
    const { api } = await factory.buildControl({
      initialState: {
        timesliceStartAsPercentageOfTimeRange: 0.25,
        timesliceEndAsPercentageOfTimeRange: 0.5,
      },
      finalizeApi,
      uuid,
      controlGroupApi,
    });
    if (!api.CustomPrependComponent) {
      throw new Error('API does not return CustomPrependComponent');
    }
    const { findByTestId } = render(<api.CustomPrependComponent />);
    fireEvent.click(await findByTestId('timeSlider-nextTimeWindow'));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(new Date(api.timeslice$.value![0]).toISOString()).toEqual('2024-06-09T12:00:00.000Z');
    expect(new Date(api.timeslice$.value![1]).toISOString()).toEqual('2024-06-09T18:00:00.000Z');
  });

  test('Clicking next button should wrap when time range end is reached', async () => {
    const { api } = await factory.buildControl({
      initialState: {
        timesliceStartAsPercentageOfTimeRange: 0.25,
        timesliceEndAsPercentageOfTimeRange: 0.5,
      },
      finalizeApi,
      uuid,
      controlGroupApi,
    });
    if (!api.CustomPrependComponent) {
      throw new Error('API does not return CustomPrependComponent');
    }
    const { findByTestId } = render(<api.CustomPrependComponent />);
    fireEvent.click(await findByTestId('timeSlider-nextTimeWindow'));
    fireEvent.click(await findByTestId('timeSlider-nextTimeWindow'));
    fireEvent.click(await findByTestId('timeSlider-nextTimeWindow'));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(new Date(api.timeslice$.value![0]).toISOString()).toEqual('2024-06-09T00:00:00.000Z');
    expect(new Date(api.timeslice$.value![1]).toISOString()).toEqual('2024-06-09T06:00:00.000Z');
  });

  test('Resetting state should reset timeslice', async () => {
    const rawState = {
      timesliceStartAsPercentageOfTimeRange: 0.25,
      timesliceEndAsPercentageOfTimeRange: 0.5,
    };
    controlGroupApi.setLastSavedStateForChild(uuid, {
      rawState,
    });
    const { api } = await factory.buildControl({
      initialState: rawState,
      finalizeApi,
      uuid,
      controlGroupApi,
    });
    if (!api.CustomPrependComponent) {
      throw new Error('API does not return CustomPrependComponent');
    }

    // advance time by clicking next
    const { findByTestId } = render(<api.CustomPrependComponent />);
    fireEvent.click(await findByTestId('timeSlider-nextTimeWindow'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    // ensure time advanced
    expect(new Date(api.timeslice$.value![0]).toISOString()).toEqual('2024-06-09T12:00:00.000Z');
    expect(new Date(api.timeslice$.value![1]).toISOString()).toEqual('2024-06-09T18:00:00.000Z');

    api.resetUnsavedChanges();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(new Date(api.timeslice$.value![0]).toISOString()).toEqual('2024-06-09T06:00:00.000Z');
    expect(new Date(api.timeslice$.value![1]).toISOString()).toEqual('2024-06-09T12:00:00.000Z');
  });
});
