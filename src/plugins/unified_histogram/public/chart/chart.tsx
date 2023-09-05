/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement, useMemo, useState, useEffect, useCallback, memo } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EmbeddableComponentProps, Suggestion } from '@kbn/lens-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { DataView, DataViewField, DataViewType } from '@kbn/data-views-plugin/public';
import type { LensEmbeddableInput } from '@kbn/lens-plugin/public';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { Subject } from 'rxjs';
import { HitsCounter } from '../hits_counter';
import { Histogram } from './histogram';
import { useChartPanels } from './hooks/use_chart_panels';
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
import { useTotalHits } from './hooks/use_total_hits';
import { useRequestParams } from './hooks/use_request_params';
import { useChartStyles } from './hooks/use_chart_styles';
import { useChartActions } from './hooks/use_chart_actions';
import { ChartConfigPanel } from './chart_config_panel';
import { getLensAttributes } from './utils/get_lens_attributes';
import { useRefetch } from './hooks/use_refetch';
import { useEditVisualization } from './hooks/use_edit_visualization';

export interface ChartProps {
  className?: string;
  services: UnifiedHistogramServices;
  dataView: DataView;
  query?: Query | AggregateQuery;
  filters?: Filter[];
  isPlainRecord?: boolean;
  currentSuggestion?: Suggestion;
  allSuggestions?: Suggestion[];
  timeRange?: TimeRange;
  relativeTimeRange?: TimeRange;
  request?: UnifiedHistogramRequestContext;
  hits?: UnifiedHistogramHitsContext;
  chart?: UnifiedHistogramChartContext;
  breakdown?: UnifiedHistogramBreakdownContext;
  appendHitsCounter?: ReactElement;
  appendHistogram?: ReactElement;
  disableAutoFetching?: boolean;
  disableTriggers?: LensEmbeddableInput['disableTriggers'];
  disabledActions?: LensEmbeddableInput['disabledActions'];
  input$?: UnifiedHistogramInput$;
  lensTablesAdapter?: Record<string, Datatable>;
  isOnHistogramMode?: boolean;
  onResetChartHeight?: () => void;
  onChartHiddenChange?: (chartHidden: boolean) => void;
  onTimeIntervalChange?: (timeInterval: string) => void;
  onBreakdownFieldChange?: (breakdownField: DataViewField | undefined) => void;
  onSuggestionChange?: (suggestion: Suggestion | undefined) => void;
  onTotalHitsChange?: (status: UnifiedHistogramFetchStatus, result?: number | Error) => void;
  onChartLoad?: (event: UnifiedHistogramChartLoadEvent) => void;
  onFilter?: LensEmbeddableInput['onFilter'];
  onBrushEnd?: LensEmbeddableInput['onBrushEnd'];
  withDefaultActions: EmbeddableComponentProps['withDefaultActions'];
}

const HistogramMemoized = memo(Histogram);

export function Chart({
  className,
  services,
  dataView,
  query: originalQuery,
  filters: originalFilters,
  timeRange: originalTimeRange,
  relativeTimeRange: originalRelativeTimeRange,
  request,
  hits,
  chart,
  breakdown,
  currentSuggestion,
  allSuggestions,
  isPlainRecord,
  appendHitsCounter,
  appendHistogram,
  disableAutoFetching,
  disableTriggers,
  disabledActions,
  input$: originalInput$,
  lensTablesAdapter,
  isOnHistogramMode,
  onResetChartHeight,
  onChartHiddenChange,
  onTimeIntervalChange,
  onSuggestionChange,
  onBreakdownFieldChange,
  onTotalHitsChange,
  onChartLoad,
  onFilter,
  onBrushEnd,
  withDefaultActions,
}: ChartProps) {
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
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
    isPlainRecord,
  });

  const chartVisible = !!(
    chart &&
    !chart.hidden &&
    dataView.id &&
    dataView.type !== DataViewType.ROLLUP &&
    (isPlainRecord || (!isPlainRecord && dataView.isTimeBased()))
  );

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
    currentSuggestion,
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
    isPlainRecord,
  });

  const {
    resultCountCss,
    resultCountInnerCss,
    resultCountTitleCss,
    resultCountToggleCss,
    histogramCss,
    breakdownFieldSelectorGroupCss,
    breakdownFieldSelectorItemCss,
    suggestionsSelectorItemCss,
    chartToolButtonCss,
  } = useChartStyles(chartVisible);

  const lensAttributesContext = useMemo(
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
      breakdown?.field,
      chart?.timeInterval,
      chart?.title,
      currentSuggestion,
      dataView,
      filters,
      query,
    ]
  );

  const onSuggestionSelectorChange = useCallback(
    (s: Suggestion | undefined) => {
      onSuggestionChange?.(s);
    },
    [onSuggestionChange]
  );

  useEffect(() => {
    // close the flyout for dataview mode
    // or if no chart is visible
    if (!chartVisible && isFlyoutVisible) {
      setIsFlyoutVisible(false);
    }
  }, [chartVisible, isFlyoutVisible]);

  const onEditVisualization = useEditVisualization({
    services,
    dataView,
    relativeTimeRange: originalRelativeTimeRange ?? relativeTimeRange,
    lensAttributes: lensAttributesContext.attributes,
    isPlainRecord,
  });
  const LensSaveModalComponent = services.lens.SaveModalComponent;
  const canSaveVisualization =
    chartVisible && currentSuggestion && services.capabilities.dashboard?.showWriteControls;

  const renderEditButton = useMemo(
    () => (
      <EuiButtonIcon
        size="xs"
        iconType="pencil"
        onClick={() => setIsFlyoutVisible(true)}
        data-test-subj="unifiedHistogramEditFlyoutVisualization"
        aria-label={i18n.translate('unifiedHistogram.editVisualizationButton', {
          defaultMessage: 'Edit visualization',
        })}
        disabled={isFlyoutVisible}
      />
    ),
    [isFlyoutVisible]
  );

  const canEditVisualizationOnTheFly = currentSuggestion && chartVisible;

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
          alignItems="center"
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
                  <EuiFlexItem css={suggestionsSelectorItemCss}>
                    <SuggestionSelector
                      suggestions={allSuggestions}
                      activeSuggestion={currentSuggestion}
                      onSuggestionChange={onSuggestionSelectorChange}
                    />
                  </EuiFlexItem>
                )}
                {canSaveVisualization && (
                  <>
                    <EuiFlexItem grow={false} css={chartToolButtonCss}>
                      <EuiToolTip
                        content={i18n.translate('unifiedHistogram.saveVisualizationButton', {
                          defaultMessage: 'Save visualization',
                        })}
                      >
                        <EuiButtonIcon
                          size="xs"
                          iconType="save"
                          onClick={() => setIsSaveModalVisible(true)}
                          data-test-subj="unifiedHistogramSaveVisualization"
                          aria-label={i18n.translate('unifiedHistogram.saveVisualizationButton', {
                            defaultMessage: 'Save visualization',
                          })}
                        />
                      </EuiToolTip>
                    </EuiFlexItem>
                  </>
                )}
                {canEditVisualizationOnTheFly && (
                  <EuiFlexItem grow={false} css={chartToolButtonCss}>
                    {!isFlyoutVisible ? (
                      <EuiToolTip
                        content={i18n.translate('unifiedHistogram.editVisualizationButton', {
                          defaultMessage: 'Edit visualization',
                        })}
                      >
                        {renderEditButton}
                      </EuiToolTip>
                    ) : (
                      renderEditButton
                    )}
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
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      {chartVisible && (
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
              lensAttributesContext={lensAttributesContext}
              isPlainRecord={isPlainRecord}
              disableTriggers={disableTriggers}
              disabledActions={disabledActions}
              onTotalHitsChange={onTotalHitsChange}
              hasLensSuggestions={!Boolean(isOnHistogramMode)}
              onChartLoad={onChartLoad}
              onFilter={onFilter}
              onBrushEnd={onBrushEnd}
              withDefaultActions={withDefaultActions}
            />
          </section>
          {appendHistogram}
        </EuiFlexItem>
      )}
      {canSaveVisualization && isSaveModalVisible && lensAttributesContext.attributes && (
        <LensSaveModalComponent
          initialInput={lensAttributesContext.attributes as unknown as LensEmbeddableInput}
          onSave={() => {}}
          onClose={() => setIsSaveModalVisible(false)}
          isSaveable={false}
        />
      )}
      {isFlyoutVisible && (
        <ChartConfigPanel
          {...{
            services,
            lensAttributesContext,
            dataView,
            lensTablesAdapter,
            currentSuggestion,
            isFlyoutVisible,
            setIsFlyoutVisible,
            isPlainRecord,
            query: originalQuery,
            onSuggestionChange,
          }}
        />
      )}
    </EuiFlexGroup>
  );
}
