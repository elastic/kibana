/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiThemeProvider } from '@elastic/eui';
import { act, render, waitFor } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';

import {
  ControlValuesSource,
  DEFAULT_DSL_OPTIONS_LIST_STATE,
  DEFAULT_PINNED_CONTROL_STATE,
} from '@kbn/controls-constants';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';

import { DashboardContext } from '../../dashboard_api/use_dashboard_api';
import { DashboardInternalContext } from '../../dashboard_api/use_dashboard_internal_api';
import { buildMockDashboardApi, getMockPanels } from '../../mocks';
import { DashboardViewport } from './dashboard_viewport';
import type { DashboardInternalApi } from '../../dashboard_api/types';

jest.mock('../grid', () => {
  return {
    DashboardGrid: () => <div data-test-subj="mockDashboardGrid" />,
  };
});

jest.mock('./empty_screen/awaiting_filters_screen', () => {
  return {
    AwaitingFiltersScreen: () => <div data-test-subj="mockAwaitingFiltersScreen" />,
  };
});

const pinnedControls = [
  {
    ...DEFAULT_PINNED_CONTROL_STATE,
    id: 'control1',
    type: 'options_list_control',
    config: {
      ...DEFAULT_DSL_OPTIONS_LIST_STATE,
      values_source: ControlValuesSource.FIELD,
      data_view_id: '',
      field_name: '',
    },
  },
] as DashboardState['pinned_panels'];

const renderDashboardViewport = async ({
  internalApiOverrides,
  pinnedPanels,
  initiallyAwaitingFilters,
}: {
  internalApiOverrides?: Partial<DashboardInternalApi>;
  pinnedPanels?: DashboardState['pinned_panels'];
  initiallyAwaitingFilters?: boolean;
} = {}) => {
  const panels = getMockPanels();
  const { api: baseApi, internalApi } = buildMockDashboardApi({
    overrides: {
      panels,
      ...(pinnedPanels ? { pinned_panels: pinnedPanels } : {}),
    },
  });
  // drive the awaiting state directly, independent of any real control
  const awaitingRequiredFilters$ = new BehaviorSubject<boolean>(false);
  const api = { ...baseApi, awaitingRequiredFilters$ };
  const component = render(
    <EuiThemeProvider>
      <DashboardContext.Provider value={api}>
        <DashboardInternalContext.Provider
          value={{
            ...internalApi,
            ...internalApiOverrides,
          }}
        >
          <DashboardViewport initiallyAwaitingFilters={initiallyAwaitingFilters} />
        </DashboardInternalContext.Provider>
      </DashboardContext.Provider>
    </EuiThemeProvider>
  );

  // wait for first render
  await waitFor(() => {
    component.getByTestId('dshDashboardViewport');
  });

  return { dashboardApi: api, internalApi, component, awaitingRequiredFilters$ };
};

describe('DashboardViewport', () => {
  test('should render DashboardGrid when dashboard has panels', async () => {
    const { component } = await renderDashboardViewport();
    await waitFor(() => {
      component.getByTestId('mockDashboardGrid');
    });
  });

  test('renders print mode styles', async () => {
    const { component, dashboardApi } = await renderDashboardViewport();
    dashboardApi.setViewMode('print');

    await waitFor(() => {
      const viewport = component.getByTestId('dshDashboardViewport');
      expect(viewport).toHaveClass('dshDashboardViewport--print');
    });
    /**
     * TODO: Once Dashboard is converted to Emotion, we should be able to uncomment these lines in order
     * to actually test the print mode functionality - currently, this is broken because our Sass styles
     * are imported on the Dashboard renderer rather than the viewport
     */
    // const gridLayout = component.getByTestId('kbnGridLayout');
    // expect(gridLayout).toHaveStyleRule('display', 'block !important');
  });

  describe('required controls', () => {
    test('shows the awaiting screen instead of the grid while awaiting required filters', async () => {
      const { component, awaitingRequiredFilters$ } = await renderDashboardViewport();
      await waitFor(() => component.getByTestId('mockDashboardGrid'));

      act(() => awaitingRequiredFilters$.next(true));
      await waitFor(() => {
        component.getByTestId('mockAwaitingFiltersScreen');
        expect(component.queryByTestId('mockDashboardGrid')).toBeNull();
      });
    });

    test('shows the grid again once the required filters are provided', async () => {
      const { component, awaitingRequiredFilters$ } = await renderDashboardViewport();
      act(() => awaitingRequiredFilters$.next(true));
      await waitFor(() => component.getByTestId('mockAwaitingFiltersScreen'));

      act(() => awaitingRequiredFilters$.next(false));
      await waitFor(() => {
        component.getByTestId('mockDashboardGrid');
        expect(component.queryByTestId('mockAwaitingFiltersScreen')).toBeNull();
      });
    });

    test('uses the initial value until every pinned control has mounted', async () => {
      const { component, awaitingRequiredFilters$, dashboardApi } = await renderDashboardViewport({
        pinnedPanels: pinnedControls,
        initiallyAwaitingFilters: true,
      });
      // control not mounted yet: the (false) api value is ignored
      await waitFor(() => component.getByTestId('mockAwaitingFiltersScreen'));
      expect(component.queryByTestId('mockDashboardGrid')).toBeNull();

      // once mounted, the control's published value takes over
      act(() => {
        dashboardApi.registerChildApi({ uuid: 'control1' } as DefaultEmbeddableApi);
      });
      await waitFor(() => component.getByTestId('mockDashboardGrid'));

      act(() => awaitingRequiredFilters$.next(true));
      await waitFor(() => component.getByTestId('mockAwaitingFiltersScreen'));
    });

    test('does not show the awaiting screen when not initially awaiting and controls are unmounted', async () => {
      const { component } = await renderDashboardViewport({
        pinnedPanels: pinnedControls,
        initiallyAwaitingFilters: false,
      });
      await waitFor(() => component.getByTestId('mockDashboardGrid'));
      expect(component.queryByTestId('mockAwaitingFiltersScreen')).toBeNull();
    });
  });
});
