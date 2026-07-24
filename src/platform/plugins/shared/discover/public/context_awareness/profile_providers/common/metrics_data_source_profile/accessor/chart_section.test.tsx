/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import type { ExpressionRendererEvent } from '@kbn/expressions-plugin/public';
import type {
  ChartSectionProps,
  UnifiedHistogramFetch$,
  UnifiedHistogramFetch$Arguments,
  UnifiedHistogramFetchParams,
  UnifiedHistogramServices,
} from '@kbn/unified-histogram/types';
import type { MetricsGridSettings } from '@kbn/unified-chart-section-viewer';
import { METRICS_GRID_SETTINGS_DEFAULTS } from '@kbn/unified-chart-section-viewer';
import { createChartSection } from './chart_section';
import type { ChartSectionConfiguration } from '../../../../types';
import { DataSourceCategory } from '../../../../profiles';
import {
  useAppStateSelector,
  useCurrentTabAction,
  useInternalStateDispatch,
} from '../../../../../application/main/state_management/redux';
import { METRICS_DATA_SOURCE_PROFILE_ID } from '../profile';
import type { ContextAwarenessToolkit, ContextAwarenessToolkitActions } from '../../../../toolkit';
import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../../../toolkit';

type UnifiedGridProps = ChartSectionProps & {
  actions: ContextAwarenessToolkitActions;
  breakdownField?: string;
  onBreakdownFieldChange?: (fieldName?: string) => void;
  externalServices?: {
    discoverShared?: unknown;
    dataViews?: unknown;
    notifications?: { showErrorDialog: (args: { title: string; error: Error }) => void };
    docLinks?: { links: { query: { queryESQL: string } } };
    logger?: unknown;
    featureFlags?: unknown;
  };
  gridSettings?: MetricsGridSettings;
  onGridSettingsChange?: (update: Partial<MetricsGridSettings>) => void;
};

let unifiedGridProps: UnifiedGridProps | undefined;

jest.mock('@kbn/unified-chart-section-viewer', () => ({
  UnifiedMetricsExperienceGrid: (props: UnifiedGridProps) => {
    unifiedGridProps = props;
    return null;
  },
  METRICS_GRID_SETTINGS_DEFAULTS: {
    counterAggregation: 'sum',
    gaugeAggregation: 'avg',
    histogramPercentile: 'p95',
  },
}));

const createFakeGridSettingsAdapter = (initialState: MetricsGridSettings) => {
  const subject = new BehaviorSubject(initialState);
  return {
    getState: () => subject.getValue(),
    getState$: () => subject.asObservable(),
    setState: (state: MetricsGridSettings) => subject.next(state),
    updateState: jest.fn((update: Partial<MetricsGridSettings>) =>
      subject.next({ ...subject.getValue(), ...update })
    ),
  };
};

jest.mock('../../../../../application/main/state_management/redux', () => ({
  internalStateActions: {
    updateAppState: jest.fn(),
  },
  useAppStateSelector: jest.fn(),
  useCurrentTabAction: jest.fn(),
  useInternalStateDispatch: jest.fn(),
}));

const mockDiscoverShared = { __sentinel: 'discoverShared' };
const mockDataViews = { __sentinel: 'dataViews' };
const mockShowErrorDialog = jest.fn();
const mockEsqlReferenceHref = 'https://www.elastic.co/docs/reference/esql';
const mockScopedLogger = { __sentinel: 'scopedLogger' };
const mockLogger = { __sentinel: 'logger', get: jest.fn(() => mockScopedLogger) };
const mockFeatureFlags = { __sentinel: 'featureFlags' };

jest.mock('../../../../../hooks/use_discover_services', () => ({
  useDiscoverServices: jest.fn(() => ({
    discoverShared: mockDiscoverShared,
    dataViews: mockDataViews,
    notifications: {
      showErrorDialog: mockShowErrorDialog,
    },
    docLinks: {
      links: {
        query: {
          queryESQL: mockEsqlReferenceHref,
        },
      },
    },
    logger: mockLogger,
    core: {
      featureFlags: mockFeatureFlags,
    },
  })),
}));

const mockDispatch = jest.fn();
const mockUpdateAppStateAction = jest.fn((payload) => ({ type: 'updateAppState', payload }));

const createChartSectionProps = (overrides: Partial<ChartSectionProps> = {}): ChartSectionProps => {
  const fetch$ = new ReplaySubject<UnifiedHistogramFetch$Arguments>(1) as UnifiedHistogramFetch$;

  return {
    services: {
      data: { search: { search: jest.fn() } },
      uiSettings: {},
    } as unknown as UnifiedHistogramServices,
    renderToggleActions: () => undefined,
    fetchParams: {} as unknown as UnifiedHistogramFetchParams,
    fetch$,
    isComponentVisible: true,
    isTabSelected: true,
    ...overrides,
  };
};

const renderChartSection = (overrides: Partial<ChartSectionProps> = {}) => {
  const toolkitActions: ContextAwarenessToolkitActions = {
    addFilter: jest.fn(),
  };
  const gridSettingsAdapter = createFakeGridSettingsAdapter(METRICS_GRID_SETTINGS_DEFAULTS);
  const getChartSection = createChartSection();

  if (!getChartSection) {
    throw new Error('getChartSectionConfiguration was not created.');
  }

  const configFactory = getChartSection(
    () => ({ replaceDefaultChart: false } as ChartSectionConfiguration),
    {
      context: { category: DataSourceCategory.Metrics },
      toolkit: {
        ...EMPTY_CONTEXT_AWARENESS_TOOLKIT,
        actions: toolkitActions,
        getStateAdapter: jest.fn(
          () => gridSettingsAdapter
        ) as unknown as ContextAwarenessToolkit['getStateAdapter'],
      },
    }
  );

  if (!configFactory) {
    throw new Error('getChartSectionConfiguration was not created.');
  }

  const config = configFactory();

  if (!config.replaceDefaultChart) {
    throw new Error('Expected chart section configuration to replace the default chart.');
  }

  render(<>{config.renderChartSection(createChartSectionProps(overrides))}</>);

  return { toolkitActions, gridSettingsAdapter };
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

  it('should not prevent default when onFilter is provided', () => {
    const onFilter = jest.fn();
    const preventDefault = jest.fn();
    const event = { preventDefault } as unknown as ExpressionRendererEvent['data'];

    renderChartSection({ onFilter });

    const gridOnFilter = unifiedGridProps?.onFilter;

    expect(gridOnFilter).toEqual(expect.any(Function));
    gridOnFilter?.(event);

    expect(onFilter).toHaveBeenCalledWith(event);
    expect(preventDefault).not.toHaveBeenCalled();
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

  it('forwards externalServices (discoverShared, dataViews, notifications, docLinks, scoped logger, featureFlags) to the metrics grid', () => {
    renderChartSection();

    expect(mockLogger.get).toHaveBeenCalledWith(METRICS_DATA_SOURCE_PROFILE_ID);
    expect(unifiedGridProps?.externalServices).toEqual({
      discoverShared: mockDiscoverShared,
      dataViews: mockDataViews,
      notifications: expect.objectContaining({
        showErrorDialog: mockShowErrorDialog,
      }),
      docLinks: expect.objectContaining({
        links: { query: { queryESQL: mockEsqlReferenceHref } },
      }),
      logger: mockScopedLogger,
      featureFlags: mockFeatureFlags,
    });
  });

  it('passes toolkit actions to UnifiedMetricsExperienceGrid', () => {
    const { toolkitActions } = renderChartSection();

    expect(unifiedGridProps?.actions).toBe(toolkitActions);
  });

  it('passes the resolved grid settings to UnifiedMetricsExperienceGrid', () => {
    renderChartSection();

    expect(unifiedGridProps?.gridSettings).toEqual(METRICS_GRID_SETTINGS_DEFAULTS);
  });

  it('updates the grid settings state adapter when onGridSettingsChange is invoked', () => {
    const { gridSettingsAdapter } = renderChartSection();

    act(() => {
      unifiedGridProps?.onGridSettingsChange?.({ counterAggregation: 'max' });
    });

    expect(gridSettingsAdapter.updateState).toHaveBeenCalledWith({ counterAggregation: 'max' });
    expect(unifiedGridProps?.gridSettings).toEqual({
      ...METRICS_GRID_SETTINGS_DEFAULTS,
      counterAggregation: 'max',
    });
  });
});
