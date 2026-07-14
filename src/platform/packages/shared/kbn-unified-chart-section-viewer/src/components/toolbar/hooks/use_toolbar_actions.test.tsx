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
import { renderHook } from '@testing-library/react';
import { useToolbarActions } from './use_toolbar_actions';
import { ExternalServicesProvider } from '../../../context/external_services';
import type { ExternalServices } from '../../../context/external_services';
import { createFeatureFlagsMock } from '../../../test_utils/create_feature_flags_mock';
import { FEATURE_FLAGS } from '../../../common/constants';
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

describe('useToolbarActions', () => {
  beforeEach(() => {
    useMetricsExperienceStateMock.mockReturnValue({
      selectedDimensions: [],
      onDimensionsChange: jest.fn(),
      isFullscreen: false,
      onToggleFullscreen: jest.fn(),
    } as unknown as ReturnType<typeof metricsExperienceStateProvider.useMetricsExperienceState>);
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

    expect(findEditGridButton(result.current.rightSideActions)).toBeDefined();
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
});
