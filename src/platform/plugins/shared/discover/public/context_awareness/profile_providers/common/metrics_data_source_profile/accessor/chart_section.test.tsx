/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ReplaySubject } from 'rxjs';
import type { ExpressionRendererEvent } from '@kbn/expressions-plugin/public';
import type {
  ChartSectionProps,
  UnifiedHistogramFetch$,
  UnifiedHistogramFetch$Arguments,
  UnifiedHistogramFetchParams,
  UnifiedHistogramServices,
} from '@kbn/unified-histogram/types';
import { createChartSection } from './chart_section';
import type {
  ChartSectionConfiguration,
  ChartSectionConfigurationExtensionParams,
} from '../../../../types';
import { DataSourceCategory } from '../../../../profiles';
import {
  useAppStateSelector,
  useCurrentTabAction,
  useInternalStateDispatch,
} from '../../../../../application/main/state_management/redux';

type UnifiedGridProps = ChartSectionProps & {
  actions: ChartSectionConfigurationExtensionParams['actions'];
  breakdownField?: string;
  onBreakdownFieldChange?: (fieldName?: string) => void;
};

let unifiedGridProps: UnifiedGridProps | undefined;

jest.mock('@kbn/unified-chart-section-viewer', () => ({
  UnifiedMetricsExperienceGrid: (props: UnifiedGridProps) => {
    unifiedGridProps = props;
    return null;
  },
}));

jest.mock('../../../../../application/main/state_management/redux', () => ({
  internalStateActions: {
    updateAppState: jest.fn(),
  },
  useAppStateSelector: jest.fn(),
  useCurrentTabAction: jest.fn(),
  useInternalStateDispatch: jest.fn(),
}));

const mockDispatch = jest.fn();
const mockUpdateAppStateAction = jest.fn((payload) => ({ type: 'updateAppState', payload }));

const createChartSectionProps = (overrides: Partial<ChartSectionProps> = {}): ChartSectionProps => {
  const fetch$ = new ReplaySubject<UnifiedHistogramFetch$Arguments>(1) as UnifiedHistogramFetch$;

  return {
    services: {} as unknown as UnifiedHistogramServices,
    renderToggleActions: () => undefined,
    fetchParams: {} as unknown as UnifiedHistogramFetchParams,
    fetch$,
    isComponentVisible: true,
    ...overrides,
  };
};

const renderChartSection = (overrides: Partial<ChartSectionProps> = {}) => {
  const getChartSection = createChartSection();

  if (!getChartSection) {
    throw new Error('getChartSectionConfiguration was not created.');
  }

  const configFactory = getChartSection(
    () => ({ replaceDefaultChart: false } as ChartSectionConfiguration),
    { context: { category: DataSourceCategory.Metrics } }
  );

  if (!configFactory) {
    throw new Error('getChartSectionConfiguration was not created.');
  }

  const config = configFactory({ actions: {} } as ChartSectionConfigurationExtensionParams);

  if (!config.replaceDefaultChart) {
    throw new Error('Expected chart section configuration to replace the default chart.');
  }

  render(<>{config.renderChartSection(createChartSectionProps(overrides))}</>);
};

describe('MetricsExperienceGridWrapper', () => {
  beforeEach(() => {
    unifiedGridProps = undefined;
    (useAppStateSelector as jest.Mock).mockImplementation((selector) =>
      selector({ breakdownField: 'host.name' })
    );
    (useInternalStateDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useCurrentTabAction as jest.Mock).mockReturnValue(mockUpdateAppStateAction);
    mockDispatch.mockClear();
    mockUpdateAppStateAction.mockClear();
  });

  it('wraps onFilter to prevent default and forward the event', () => {
    const onFilter = jest.fn();
    const preventDefault = jest.fn();
    const event = { preventDefault } as unknown as ExpressionRendererEvent['data'];

    renderChartSection({ onFilter });

    const gridOnFilter = unifiedGridProps?.onFilter;

    expect(gridOnFilter).toEqual(expect.any(Function));
    gridOnFilter?.(event);

    expect(onFilter).toHaveBeenCalledWith(event);
    expect(preventDefault).toHaveBeenCalled();
  });

  it('still prevents default when onFilter is not provided', () => {
    const preventDefault = jest.fn();
    const event = { preventDefault } as unknown as ExpressionRendererEvent['data'];

    renderChartSection();

    const gridOnFilter = unifiedGridProps?.onFilter;

    expect(gridOnFilter).toEqual(expect.any(Function));
    gridOnFilter?.(event);

    expect(preventDefault).toHaveBeenCalled();
  });

  it('dispatches breakdown updates from metrics grid callback', () => {
    renderChartSection();

    unifiedGridProps?.onBreakdownFieldChange?.('service.name');

    expect(mockUpdateAppStateAction).toHaveBeenCalledWith({
      appState: { breakdownField: 'service.name' },
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'updateAppState',
      payload: { appState: { breakdownField: 'service.name' } },
    });
  });
});
