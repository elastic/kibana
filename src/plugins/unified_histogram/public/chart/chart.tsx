/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReactElement, useMemo, useEffect, useState, useCallback } from 'react';
import { isOfAggregateQueryType } from '@kbn/es-query';
import React, { memo } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataView, DataViewField, DataViewType } from '@kbn/data-views-plugin/public';
import type { TypedLensByValueInput, Suggestion } from '@kbn/lens-plugin/public';
import { HitsCounter } from '../hits_counter';
import { Histogram } from './histogram';
import { useChartPanels } from './use_chart_panels';
import type {
  UnifiedHistogramBreakdownContext,
  UnifiedHistogramChartContext,
  UnifiedHistogramFetchStatus,
  UnifiedHistogramHitsContext,
  UnifiedHistogramChartLoadEvent,
  UnifiedHistogramRequestContext,
  UnifiedHistogramServices,
} from '../types';
import { BreakdownFieldSelector } from './breakdown_field_selector';
import { SuggestionSelector } from './suggestion_selector';
import { useTotalHits } from './use_total_hits';
import { useRequestParams } from './use_request_params';
import { useChartStyles } from './use_chart_styles';
import { useChartActions } from './use_chart_actions';
import { useRefetchId } from './use_refetch_id';
import { getLensAttributes } from './get_lens_attributes';

export interface ChartProps {
  className?: string;
  services: UnifiedHistogramServices;
  dataView: DataView;
  lastReloadRequestTime?: number;
  request?: UnifiedHistogramRequestContext;
  hits?: UnifiedHistogramHitsContext;
  chart?: UnifiedHistogramChartContext;
  chartVisible: boolean;
  setChartVisible: (flag: boolean) => void;
  columns?: string[];
  breakdown?: UnifiedHistogramBreakdownContext;
  appendHitsCounter?: ReactElement;
  appendHistogram?: ReactElement;
  onEditVisualization?: (lensAttributes: TypedLensByValueInput['attributes']) => void;
  onResetChartHeight?: () => void;
  onChartHiddenChange?: (chartHidden: boolean) => void;
  onTimeIntervalChange?: (timeInterval: string) => void;
  onBreakdownFieldChange?: (breakdownField: DataViewField | undefined) => void;
  onTotalHitsChange?: (status: UnifiedHistogramFetchStatus, result?: number | Error) => void;
  onChartLoad?: (event: UnifiedHistogramChartLoadEvent) => void;
}

const HistogramMemoized = memo(Histogram);

export function Chart({
  className,
  services,
  dataView,
  lastReloadRequestTime,
  request,
  hits,
  chart,
  chartVisible,
  setChartVisible,
  columns,
  breakdown,
  appendHitsCounter,
  appendHistogram,
  onEditVisualization: originalOnEditVisualization,
  onResetChartHeight,
  onChartHiddenChange,
  onTimeIntervalChange,
  onBreakdownFieldChange,
  onTotalHitsChange,
  onChartLoad,
}: ChartProps) {
  const [currentSuggestion, setCurrentSuggestion] = useState<Suggestion | undefined>(undefined);
  const [allSuggestions, setAllSuggestions] = useState<Suggestion[] | undefined>(undefined);

  const {
    showChartOptionsPopover,
    chartRef,
    toggleChartOptions,
    closeChartOptions,
    toggleHideChart,
  } = useChartActions({
    chart,
    onChartHiddenChange,
  });

  const panels = useChartPanels({
    chart,
    toggleHideChart,
    onTimeIntervalChange,
    closePopover: closeChartOptions,
    onResetChartHeight,
  });

  useEffect(() => {
    const visible = !!(
      chart &&
      !chart.hidden &&
      dataView.id &&
      dataView.type !== DataViewType.ROLLUP &&
      dataView.isTimeBased()
    );
    setChartVisible(visible);
  }, [chart, dataView, setChartVisible]);

  const { filters, query, relativeTimeRange } = useRequestParams({
    services,
    lastReloadRequestTime,
    request,
  });

  const refetchId = useRefetchId({
    dataView,
    lastReloadRequestTime,
    request,
    hits,
    chart,
    chartVisible,
    breakdown,
    filters,
    query,
    relativeTimeRange,
  });

  // We need to update the absolute time range whenever the refetchId changes
  const timeRange = useMemo(
    () => services.data.query.timefilter.timefilter.getAbsoluteTime(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [services.data.query.timefilter.timefilter, refetchId]
  );

  useTotalHits({
    services,
    dataView,
    lastReloadRequestTime,
    request,
    hits,
    chart,
    chartVisible,
    breakdown,
    filters,
    query,
    timeRange,
    refetchId,
    onTotalHitsChange,
  });

  const {
    resultCountCss,
    resultCountInnerCss,
    resultCountTitleCss,
    resultCountToggleCss,
    histogramCss,
    breakdownFieldSelectorGroupCss,
    breakdownFieldSelectorItemCss,
    chartToolButtonCss,
  } = useChartStyles(chartVisible);

  const lensAttributes = useMemo(
    () =>
      getLensAttributes({
        title: chart?.title,
        filters,
        query,
        dataView,
        timeInterval: chart?.timeInterval,
        breakdownField: breakdown?.field,
        suggestion: currentSuggestion,
      }),
    [
      chart?.title,
      chart?.timeInterval,
      filters,
      query,
      dataView,
      breakdown?.field,
      currentSuggestion,
    ]
  );

  useEffect(() => {
    const getSuggestions = async () => {
      const { suggestionsApi } = await services.lens.stateHelperApi();
      const context = {
        dataViewSpec: dataView.toSpec(),
        fieldName: '',
        contextualFields: columns,
        query: isOfAggregateQueryType(query) ? query : undefined,
      };
      const lensSuggestions = isOfAggregateQueryType(query)
        ? suggestionsApi(context, dataView)
        : undefined;
      const firstSuggestion = lensSuggestions?.length ? lensSuggestions[0] : undefined;
      const restSuggestions = lensSuggestions?.filter((sug) => {
        return !sug.hide && sug.visualizationId !== 'lnsLegacyMetric';
      });
      const firstSuggestionExists = restSuggestions?.find(
        (sug) => sug.visualizationId === firstSuggestion?.visualizationId
      );
      if (firstSuggestion && !firstSuggestionExists) {
        restSuggestions?.push(firstSuggestion);
      }
      setAllSuggestions(restSuggestions);
      setCurrentSuggestion(firstSuggestion);
      if (firstSuggestion?.visualizationId === 'lnsDatatable') {
        setChartVisible(false);
      } else {
        setChartVisible(true);
      }
    };
    getSuggestions();
  }, [chart, columns, dataView, query, services.lens, setChartVisible]);

  const onSuggestionChange = useCallback((suggestion) => {
    setCurrentSuggestion(suggestion);
  }, []);

  const onEditVisualization = useMemo(
    () =>
      originalOnEditVisualization
        ? () => {
            originalOnEditVisualization(lensAttributes);
          }
        : undefined,
    [lensAttributes, originalOnEditVisualization]
  );

  return (
    <EuiFlexGroup
      className={className}
      direction="column"
      alignItems="stretch"
      gutterSize="none"
      responsive={false}
    >
      <EuiFlexItem grow={false} css={resultCountCss}>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          gutterSize="none"
          responsive={false}
          css={resultCountInnerCss}
        >
          <EuiFlexItem
            grow={false}
            className="eui-textTruncate eui-textNoWrap"
            css={resultCountTitleCss}
          >
            {hits && <HitsCounter hits={hits} append={appendHitsCounter} />}
          </EuiFlexItem>
          {chart && (
            <EuiFlexItem css={resultCountToggleCss}>
              <EuiFlexGroup
                direction="row"
                gutterSize="none"
                responsive={false}
                justifyContent="flexEnd"
                css={breakdownFieldSelectorGroupCss}
              >
                {chartVisible && breakdown && (
                  <EuiFlexItem css={breakdownFieldSelectorItemCss}>
                    <BreakdownFieldSelector
                      dataView={dataView}
                      breakdown={breakdown}
                      onBreakdownFieldChange={onBreakdownFieldChange}
                    />
                  </EuiFlexItem>
                )}
                {chartVisible && currentSuggestion && allSuggestions && allSuggestions?.length > 1 && (
                  <EuiFlexItem css={breakdownFieldSelectorItemCss}>
                    <SuggestionSelector
                      suggestions={allSuggestions}
                      activeSuggestion={currentSuggestion}
                      onSuggestionChange={onSuggestionChange}
                    />
                  </EuiFlexItem>
                )}
                {onEditVisualization && (
                  <EuiFlexItem grow={false} css={chartToolButtonCss}>
                    <EuiToolTip
                      content={i18n.translate('unifiedHistogram.editVisualizationButton', {
                        defaultMessage: 'Edit visualization',
                      })}
                    >
                      <EuiButtonIcon
                        size="xs"
                        iconType="lensApp"
                        onClick={onEditVisualization}
                        data-test-subj="unifiedHistogramEditVisualization"
                        aria-label={i18n.translate('unifiedHistogram.editVisualizationButton', {
                          defaultMessage: 'Edit visualization',
                        })}
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                )}
                {chartVisible && (
                  <EuiFlexItem grow={false} css={chartToolButtonCss}>
                    <EuiPopover
                      id="unifiedHistogramChartOptions"
                      button={
                        <EuiToolTip
                          content={i18n.translate('unifiedHistogram.chartOptionsButton', {
                            defaultMessage: 'Chart options',
                          })}
                        >
                          <EuiButtonIcon
                            size="xs"
                            iconType="gear"
                            onClick={toggleChartOptions}
                            data-test-subj="unifiedHistogramChartOptionsToggle"
                            aria-label={i18n.translate('unifiedHistogram.chartOptionsButton', {
                              defaultMessage: 'Chart options',
                            })}
                          />
                        </EuiToolTip>
                      }
                      isOpen={showChartOptionsPopover}
                      closePopover={closeChartOptions}
                      panelPaddingSize="none"
                      anchorPosition="downLeft"
                    >
                      <EuiContextMenu initialPanelId={0} panels={panels} />
                    </EuiPopover>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      {chartVisible && chart && (
        <EuiFlexItem>
          <section
            ref={(element) => (chartRef.current.element = element)}
            tabIndex={-1}
            aria-label={i18n.translate('unifiedHistogram.histogramOfFoundDocumentsAriaLabel', {
              defaultMessage: 'Histogram of found documents',
            })}
            css={histogramCss}
          >
            <HistogramMemoized
              services={services}
              dataView={dataView}
              lastReloadRequestTime={lastReloadRequestTime}
              request={request}
              hits={hits}
              chart={chart}
              timeRange={timeRange}
              lensAttributes={lensAttributes}
              onTotalHitsChange={onTotalHitsChange}
              onChartLoad={onChartLoad}
            />
          </section>
          {appendHistogram}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
