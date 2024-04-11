/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement } from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { Capabilities } from '@kbn/core/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Suggestion } from '@kbn/lens-plugin/public';
import type { UnifiedHistogramFetchStatus } from '../types';
import { Chart, type ChartProps } from './chart';
import type { ReactWrapper } from 'enzyme';
import { unifiedHistogramServicesMock } from '../__mocks__/services';
import { getLensVisMock } from '../__mocks__/lens_vis';
import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
import { of } from 'rxjs';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { dataViewMock } from '../__mocks__/data_view';
import { BreakdownFieldSelector } from './breakdown_field_selector';
import { SuggestionSelector } from './suggestion_selector';
import { checkChartAvailability } from './check_chart_availability';
import { allSuggestionsMock } from '../__mocks__/suggestions';

let mockUseEditVisualization: jest.Mock | undefined = jest.fn();

jest.mock('./hooks/use_edit_visualization', () => ({
  useEditVisualization: () => mockUseEditVisualization,
}));

async function mountComponent({
  customToggle,
  noChart,
  noHits,
  noBreakdown,
  chartHidden = false,
  appendHistogram,
  dataView = dataViewWithTimefieldMock,
  allSuggestions,
  isPlainRecord,
  hasDashboardPermissions,
  isChartLoading,
  hasHistogramSuggestionForESQL,
}: {
  customToggle?: ReactElement;
  noChart?: boolean;
  noHits?: boolean;
  noBreakdown?: boolean;
  chartHidden?: boolean;
  appendHistogram?: ReactElement;
  dataView?: DataView;
  allSuggestions?: Suggestion[];
  isPlainRecord?: boolean;
  hasDashboardPermissions?: boolean;
  isChartLoading?: boolean;
  hasHistogramSuggestionForESQL?: boolean;
} = {}) {
  (searchSourceInstanceMock.fetch$ as jest.Mock).mockImplementation(
    jest.fn().mockReturnValue(of({ rawResponse: { hits: { total: noHits ? 0 : 2 } } }))
  );

  const services = {
    ...unifiedHistogramServicesMock,
    capabilities: {
      dashboard: {
        showWriteControls: hasDashboardPermissions ?? true,
      },
    } as unknown as Capabilities,
  };

  const chart = noChart
    ? undefined
    : {
        status: 'complete' as UnifiedHistogramFetchStatus,
        hidden: chartHidden,
        timeInterval: 'auto',
        bucketInterval: {
          scaled: true,
          description: 'test',
          scale: 2,
        },
      };

  const requestParams = {
    query: isPlainRecord
      ? { esql: 'from logs | limit 10' }
      : {
          language: 'kuery',
          query: '',
        },
    filters: [],
    relativeTimeRange: { from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' },
    getTimeRange: () => ({ from: '2020-05-14T11:05:13.590', to: '2020-05-14T11:20:13.590' }),
    updateTimeRange: () => {},
  };

  const lensVisService = (
    await getLensVisMock({
      query: requestParams.query,
      filters: requestParams.filters,
      isPlainRecord: Boolean(isPlainRecord),
      timeInterval: 'auto',
      dataView,
      breakdownField: undefined,
      columns: [],
      allSuggestions,
      hasHistogramSuggestionForESQL,
    })
  ).lensService;

  const props: ChartProps = {
    lensVisService,
    dataView,
    requestParams,
    services,
    hits: noHits
      ? undefined
      : {
          status: 'complete' as UnifiedHistogramFetchStatus,
          total: 2,
        },
    chart,
    breakdown: noBreakdown ? undefined : { field: undefined },
    isChartLoading: Boolean(isChartLoading),
    isPlainRecord,
    appendHistogram,
    onChartHiddenChange: jest.fn(),
    onTimeIntervalChange: jest.fn(),
    withDefaultActions: undefined,
    isChartAvailable: checkChartAvailability({ chart, dataView, isPlainRecord }),
    renderCustomChartToggleActions: customToggle ? () => customToggle : undefined,
  };

  let instance: ReactWrapper = {} as ReactWrapper;
  await act(async () => {
    instance = mountWithIntl(<Chart {...props} />);
    // wait for initial async loading to complete
    await new Promise((r) => setTimeout(r, 0));
    instance.update();
  });
  return instance;
}

describe('Chart', () => {
  beforeEach(() => {
    mockUseEditVisualization = jest.fn();
  });

  test('render when chart is undefined', async () => {
    const component = await mountComponent({ noChart: true });
    expect(component.find('[data-test-subj="unifiedHistogramToggleChartButton"]').exists()).toBe(
      true
    );
  });

  test('should render a custom toggle when provided', async () => {
    const component = await mountComponent({
      customToggle: <span data-test-subj="custom-toggle" />,
    });
    expect(component.find('[data-test-subj="custom-toggle"]').exists()).toBe(true);
    expect(component.find('[data-test-subj="unifiedHistogramToggleChartButton"]').exists()).toBe(
      false
    );
  });

  test('should not render when custom toggle is provided and chart is hidden', async () => {
    const component = await mountComponent({ customToggle: <span />, chartHidden: true });
    expect(component.find('[data-test-subj="unifiedHistogramChartPanelHidden"]').exists()).toBe(
      true
    );
  });

  test('render when chart is defined and onEditVisualization is undefined', async () => {
    mockUseEditVisualization = undefined;
    const component = await mountComponent();
    expect(
      component.find('[data-test-subj="unifiedHistogramToggleChartButton"]').exists()
    ).toBeTruthy();
    expect(
      component.find('[data-test-subj="unifiedHistogramEditVisualization"]').exists()
    ).toBeFalsy();
  });

  test('render when chart is defined and onEditVisualization is defined', async () => {
    const component = await mountComponent();
    expect(
      component.find('[data-test-subj="unifiedHistogramToggleChartButton"]').exists()
    ).toBeTruthy();
    expect(
      component.find('[data-test-subj="unifiedHistogramEditVisualization"]').exists()
    ).toBeTruthy();
  });

  test('render when chart.hidden is true', async () => {
    const component = await mountComponent({ chartHidden: true });
    expect(
      component.find('[data-test-subj="unifiedHistogramToggleChartButton"]').exists()
    ).toBeTruthy();
    expect(component.find('[data-test-subj="unifiedHistogramChart"]').exists()).toBeFalsy();
  });

  test('render when chart.hidden is false', async () => {
    const component = await mountComponent({ chartHidden: false });
    expect(
      component.find('[data-test-subj="unifiedHistogramToggleChartButton"]').exists()
    ).toBeTruthy();
    expect(component.find('[data-test-subj="unifiedHistogramChart"]').exists()).toBeTruthy();
  });

  test('render when is text based and not timebased', async () => {
    const component = await mountComponent({ isPlainRecord: true, dataView: dataViewMock });
    expect(
      component.find('[data-test-subj="unifiedHistogramToggleChartButton"]').exists()
    ).toBeTruthy();
    expect(component.find('[data-test-subj="unifiedHistogramChart"]').exists()).toBeTruthy();
  });

  test('render progress bar when text based and request is loading', async () => {
    const component = await mountComponent({ isPlainRecord: true, isChartLoading: true });
    expect(component.find('[data-test-subj="unifiedHistogramProgressBar"]').exists()).toBeTruthy();
  });

  test('triggers onEditVisualization on click', async () => {
    expect(mockUseEditVisualization).not.toHaveBeenCalled();
    const component = await mountComponent();
    await act(async () => {
      component
        .find('[data-test-subj="unifiedHistogramEditVisualization"]')
        .last()
        .simulate('click');
    });
    expect(mockUseEditVisualization).toHaveBeenCalled();
  });

  it('should render the element passed to appendHistogram', async () => {
    const appendHistogram = <div data-test-subj="appendHistogram" />;
    const component = await mountComponent({ appendHistogram });
    expect(component.find('[data-test-subj="appendHistogram"]').exists()).toBeTruthy();
  });

  it('should not render chart if data view is not time based', async () => {
    const component = await mountComponent({ dataView: dataViewMock });
    expect(component.find('[data-test-subj="unifiedHistogramChart"]').exists()).toBeFalsy();
  });

  it('should render chart if data view is time based', async () => {
    const component = await mountComponent();
    expect(component.find('[data-test-subj="unifiedHistogramChart"]').exists()).toBeTruthy();
  });

  it('should render BreakdownFieldSelector when chart is visible and breakdown is defined', async () => {
    const component = await mountComponent();
    expect(component.find(BreakdownFieldSelector).exists()).toBeTruthy();
  });

  it('should not render BreakdownFieldSelector when chart is hidden', async () => {
    const component = await mountComponent({ chartHidden: true });
    expect(component.find(BreakdownFieldSelector).exists()).toBeFalsy();
  });

  it('should not render BreakdownFieldSelector when chart is visible and breakdown is undefined', async () => {
    const component = await mountComponent({ noBreakdown: true });
    expect(component.find(BreakdownFieldSelector).exists()).toBeFalsy();
  });

  it('should render the Lens SuggestionsSelector when chart is visible and suggestions exist', async () => {
    const component = await mountComponent({
      isPlainRecord: true,
      allSuggestions: allSuggestionsMock,
    });
    expect(component.find(SuggestionSelector).exists()).toBeTruthy();
  });

  it('should render the edit on the fly button when chart is visible and suggestions exist', async () => {
    const component = await mountComponent({
      allSuggestions: allSuggestionsMock,
      isPlainRecord: true,
    });
    expect(
      component.find('[data-test-subj="unifiedHistogramEditFlyoutVisualization"]').exists()
    ).toBeTruthy();
  });

  it('should not render the edit on the fly button when chart is visible and suggestions dont exist', async () => {
    const component = await mountComponent({
      allSuggestions: [],
      hasHistogramSuggestionForESQL: false,
      isPlainRecord: true,
    });
    expect(
      component.find('[data-test-subj="unifiedHistogramEditFlyoutVisualization"]').exists()
    ).toBeFalsy();
  });

  it('should render the save button when chart is visible and suggestions exist', async () => {
    const component = await mountComponent({
      allSuggestions: allSuggestionsMock,
      isPlainRecord: true,
    });
    expect(
      component.find('[data-test-subj="unifiedHistogramSaveVisualization"]').exists()
    ).toBeTruthy();
  });

  it('should not render the save button when the dashboard save by value permissions are false', async () => {
    const component = await mountComponent({
      allSuggestions: allSuggestionsMock,
      hasDashboardPermissions: false,
    });
    expect(
      component.find('[data-test-subj="unifiedHistogramSaveVisualization"]').exists()
    ).toBeFalsy();
  });

  it('should not render the Lens SuggestionsSelector when chart is hidden', async () => {
    const component = await mountComponent({
      chartHidden: true,
      allSuggestions: allSuggestionsMock,
    });
    expect(component.find(SuggestionSelector).exists()).toBeFalsy();
  });

  it('should not render the Lens SuggestionsSelector when chart is visible and suggestions are undefined', async () => {
    const component = await mountComponent({});
    expect(component.find(SuggestionSelector).exists()).toBeFalsy();
  });
});
