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
<<<<<<< HEAD
import type { TypedLensByValueInput, Suggestion } from '@kbn/lens-plugin/public';
=======
import type { LensEmbeddableInput, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { Subject } from 'rxjs';
>>>>>>> feature-esql
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
  UnifiedHistogramInput$,
  UnifiedHistogramInputMessage,
} from '../types';
import { BreakdownFieldSelector } from './breakdown_field_selector';
import { SuggestionSelector } from './suggestion_selector';
import { useTotalHits } from './use_total_hits';
import { useRequestParams } from './use_request_params';
import { useChartStyles } from './use_chart_styles';
import { useChartActions } from './use_chart_actions';
import { getLensAttributes } from './get_lens_attributes';
import { useRefetch } from './use_refetch';

export interface ChartProps {
  className?: string;
  services: UnifiedHistogramServices;
  dataView: DataView;
  query?: Query | AggregateQuery;
  filters?: Filter[];
  timeRange?: TimeRange;
  request?: UnifiedHistogramRequestContext;
  hits?: UnifiedHistogramHitsContext;
  chart?: UnifiedHistogramChartContext;
  chartVisible: boolean;
  setChartVisible: (flag: boolean) => void;
  columns?: string[];
  breakdown?: UnifiedHistogramBreakdownContext;
  appendHitsCounter?: ReactElement;
  appendHistogram?: ReactElement;
  disableAutoFetching?: boolean;
  disableTriggers?: LensEmbeddableInput['disableTriggers'];
  disabledActions?: LensEmbeddableInput['disabledActions'];
  input$?: UnifiedHistogramInput$;
  onEditVisualization?: (lensAttributes: TypedLensByValueInput['attributes']) => void;
  onResetChartHeight?: () => void;
  onChartHiddenChange?: (chartHidden: boolean) => void;
  onTimeIntervalChange?: (timeInterval: string) => void;
  onBreakdownFieldChange?: (breakdownField: DataViewField | undefined) => void;
  onTotalHitsChange?: (status: UnifiedHistogramFetchStatus, result?: number | Error) => void;
  onChartLoad?: (event: UnifiedHistogramChartLoadEvent) => void;
  onFilter?: LensEmbeddableInput['onFilter'];
  onBrushEnd?: LensEmbeddableInput['onBrushEnd'];
}

const HistogramMemoized = memo(Histogram);

export function Chart({
  className,
  services,
  dataView,
  query: originalQuery,
  filters: originalFilters,
  timeRange: originalTimeRange,
  request,
  hits,
  chart,
  chartVisible,
  setChartVisible,
  columns,
  breakdown,
  appendHitsCounter,
  appendHistogram,
  disableAutoFetching,
  disableTriggers,
  disabledActions,
  input$: originalInput$,
  onEditVisualization: originalOnEditVisualization,
  onResetChartHeight,
  onChartHiddenChange,
  onTimeIntervalChange,
  onBreakdownFieldChange,
  onTotalHitsChange,
  onChartLoad,
  onFilter,
  onBrushEnd,
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

  const input$ = useMemo(
    () => originalInput$ ?? new Subject<UnifiedHistogramInputMessage>(),
    [originalInput$]
  );

  const { filters, query, getTimeRange, updateTimeRange, relativeTimeRange } = useRequestParams({
    services,
    query: originalQuery,
    filters: originalFilters,
    timeRange: originalTimeRange,
  });

  const refetch$ = useRefetch({
    dataView,
    request,
    hits,
    chart,
    chartVisible,
    breakdown,
    filters,
    query,
    relativeTimeRange,
    disableAutoFetching,
    input$,
    beforeRefetch: updateTimeRange,
  });

  useTotalHits({
    services,
    dataView,
    request,
    hits,
    chartVisible,
    filters,
    query,
    getTimeRange,
    refetch$,
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
              request={request}
              hits={hits}
              chart={chart}
              getTimeRange={getTimeRange}
              refetch$={refetch$}
              lensAttributes={lensAttributes}
              disableTriggers={disableTriggers}
              disabledActions={disabledActions}
              onTotalHitsChange={onTotalHitsChange}
              onChartLoad={onChartLoad}
              onFilter={onFilter}
              onBrushEnd={onBrushEnd}
            />
          </section>
          {appendHistogram}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
