/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import { renderHook } from '@testing-library/react';
import { useToolbarActions } from './use_toolbar_actions';
import { useMetricsExperienceState } from '../../observability/metrics/context/metrics_experience_state_provider';
import { useExternalServices } from '../../../context/external_services';
import { SortSelector } from '../sort_selector';
import { DimensionsSelector } from '../dimensions_selector';
import { METRICS_SORT_BY, METRICS_SORT_DIRECTION } from '../../../common/constants';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: () => ({ euiTheme: { border: { thin: '1px' } } }),
  useIsWithinMaxBreakpoint: () => false,
}));

jest.mock('../../observability/metrics/context/metrics_experience_state_provider');
jest.mock('../../../context/external_services');

const useMetricsExperienceStateMock = useMetricsExperienceState as jest.Mock;
const useExternalServicesMock = useExternalServices as jest.Mock;

// The component rendered by each left-side toolbar action
const leftSideComponents = (actions: Array<ReactElement | null>) =>
  actions.map((action) => action?.type);

describe('useToolbarActions', () => {
  beforeEach(() => {
    useMetricsExperienceStateMock.mockReturnValue({
      selectedDimensions: [],
      onDimensionsChange: jest.fn(),
      isFullscreen: false,
      onToggleFullscreen: jest.fn(),
      metricsSort: [METRICS_SORT_BY.alphabetically, METRICS_SORT_DIRECTION.asc],
      onMetricsSortChange: jest.fn(),
    });
  });

  const renderToolbarActions = () =>
    renderHook(() =>
      useToolbarActions({
        allDimensions: [],
        renderToggleActions: () => undefined,
        onOpenGridSettings: jest.fn(),
      })
    );

  it('includes the sort selector when sorting is enabled', () => {
    useExternalServicesMock.mockReturnValue({ isSortingEnabled: true });

    const { result } = renderToolbarActions();

    expect(leftSideComponents(result.current.leftSideActions)).toContain(SortSelector);
  });

  it('omits the sort selector when sorting is disabled, keeping the dimensions selector', () => {
    useExternalServicesMock.mockReturnValue({ isSortingEnabled: false });

    const { result } = renderToolbarActions();

    expect(leftSideComponents(result.current.leftSideActions)).not.toContain(SortSelector);
    expect(leftSideComponents(result.current.leftSideActions)).toContain(DimensionsSelector);
  });
});
