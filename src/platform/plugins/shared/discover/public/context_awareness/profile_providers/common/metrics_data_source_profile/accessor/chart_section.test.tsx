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
import { useAppStateSelector } from '../../../../../application/main/state_management/redux';

type UnifiedGridProps = ChartSectionProps & {
  actions: ChartSectionConfigurationExtensionParams['actions'];
  breakdownField?: string;
};

let unifiedGridProps: UnifiedGridProps | undefined;

jest.mock('@kbn/unified-chart-section-viewer', () => ({
  UnifiedMetricsExperienceGrid: (props: UnifiedGridProps) => {
    unifiedGridProps = props;
    return null;
  },
}));

jest.mock('../../../../../application/main/state_management/redux', () => ({
  useAppStateSelector: jest.fn(),
}));

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
});
