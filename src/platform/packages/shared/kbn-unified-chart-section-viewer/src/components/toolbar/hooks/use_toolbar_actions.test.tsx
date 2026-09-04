/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { useToolbarActions } from './use_toolbar_actions';
import { ExternalServicesProvider } from '../../../context/external_services';
import type { ExternalServices } from '../../../context/external_services';
import { createFeatureFlagsMock } from '../../../test_utils/create_feature_flags_mock';
import { METRICS_GRID_SORT_DEFAULTS } from '@kbn/discover-utils';
import {
  FEATURE_FLAGS,
  METRICS_TOOLBAR_SEARCH_BUTTON_DATA_TEST_SUBJ,
} from '../../../common/constants';
import { SortSelector } from '../sort_selector';
import * as metricsExperienceStateProvider from '../../observability/metrics/context/metrics_experience_state_provider';

jest.mock('../../observability/metrics/context/metrics_experience_state_provider');

const useMetricsExperienceStateMock =
  metricsExperienceStateProvider.useMetricsExperienceState as jest.MockedFunction<
    typeof metricsExperienceStateProvider.useMetricsExperienceState
  >;

const renderToolbarActionsHook = (externalServices?: ExternalServices) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ExternalServicesProvider externalServices={externalServices}>
      {children}
    </ExternalServicesProvider>
  );

  return renderHook(
    () =>
      useToolbarActions({
        allDimensions: [],
        renderToggleActions: () => undefined,
        onOpenGridSettings: jest.fn(),
      }),
    { wrapper }
  );
};

const findEditGridButton = (buttons: ReturnType<typeof useToolbarActions>['rightSideActions']) =>
  buttons?.find((button) => button['data-test-subj'] === 'metricsExperienceEditGridButton');

const findSortSelector = (elements: ReturnType<typeof useToolbarActions>['leftSideActions']) =>
  elements?.find((element) => React.isValidElement(element) && element.type === SortSelector);

describe('useToolbarActions', () => {
  beforeEach(() => {
    useMetricsExperienceStateMock.mockReturnValue({
      selectedDimensions: [],
      onDimensionsChange: jest.fn(),
      isFullscreen: false,
      onToggleFullscreen: jest.fn(),
      metricsSort: METRICS_GRID_SORT_DEFAULTS,
      onMetricsSortChange: jest.fn(),
      searchTerm: '',
      onSearchTermChange: jest.fn(),
    } as unknown as ReturnType<typeof metricsExperienceStateProvider.useMetricsExperienceState>);
  });

  it('renders the search button as the first member of the right side action group', () => {
    const { result } = renderToolbarActionsHook(undefined);

    expect(result.current.rightSideActions[0]).toEqual(
      expect.objectContaining({
        iconType: 'magnify',
        'data-test-subj': METRICS_TOOLBAR_SEARCH_BUTTON_DATA_TEST_SUBJ,
      })
    );
  });

  it('does not render the expanded search input until the search button is activated', () => {
    const { result } = renderToolbarActionsHook(undefined);

    expect(result.current.searchInput).toBeUndefined();

    act(() => {
      result.current.rightSideActions[0].onClick();
    });

    expect(result.current.searchInput).toBeDefined();
    expect(
      result.current.rightSideActions.some(
        (button) => button['data-test-subj'] === METRICS_TOOLBAR_SEARCH_BUTTON_DATA_TEST_SUBJ
      )
    ).toBe(false);
  });

  it('hides the Edit grid of metrics button when featureFlags is not provided by the host (safe default)', () => {
    const { result } = renderToolbarActionsHook(undefined);

    expect(findEditGridButton(result.current.rightSideActions)).toBeUndefined();
  });

  it('shows the Edit grid of metrics button when the feature flag resolves to true', () => {
    const { result } = renderToolbarActionsHook({
      featureFlags: createFeatureFlagsMock({
        [FEATURE_FLAGS.IS_EDIT_GRID_SETTINGS_ENABLED]: true,
      }),
    });

    expect(findEditGridButton(result.current.rightSideActions)).toEqual(
      expect.objectContaining({
        'data-ebt-action': 'editGridSettings',
        'data-ebt-element': 'chartsToolbar',
      })
    );
  });

  it('hides the Edit grid of metrics button when the feature flag resolves to false', () => {
    const { result } = renderToolbarActionsHook({
      featureFlags: createFeatureFlagsMock({
        [FEATURE_FLAGS.IS_EDIT_GRID_SETTINGS_ENABLED]: false,
      }),
    });

    expect(findEditGridButton(result.current.rightSideActions)).toBeUndefined();
  });

  it('hides the Edit grid of metrics button when featureFlags is provided but the flag has no override (falls back to false)', () => {
    const { result } = renderToolbarActionsHook({
      featureFlags: createFeatureFlagsMock(),
    });

    expect(findEditGridButton(result.current.rightSideActions)).toBeUndefined();
  });

  it('shows the sort selector when featureFlags is not provided by the host (fallback enabled)', () => {
    const { result } = renderToolbarActionsHook(undefined);

    expect(findSortSelector(result.current.leftSideActions)).toBeDefined();
  });

  it('shows the sort selector when the feature flag resolves to true', () => {
    const { result } = renderToolbarActionsHook({
      featureFlags: createFeatureFlagsMock({
        [FEATURE_FLAGS.IS_SORTING_ENABLED]: true,
      }),
    });

    expect(findSortSelector(result.current.leftSideActions)).toBeDefined();
  });

  it('hides the sort selector when the feature flag resolves to false', () => {
    const { result } = renderToolbarActionsHook({
      featureFlags: createFeatureFlagsMock({
        [FEATURE_FLAGS.IS_SORTING_ENABLED]: false,
      }),
    });

    expect(findSortSelector(result.current.leftSideActions)).toBeUndefined();
  });

  it('shows the sort selector when featureFlags is provided but the flag has no override (falls back to true)', () => {
    const { result } = renderToolbarActionsHook({
      featureFlags: createFeatureFlagsMock(),
    });

    expect(findSortSelector(result.current.leftSideActions)).toBeDefined();
  });
});
