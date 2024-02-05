/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement, useMemo, useState, useEffect, useCallback, memo } from 'react';
import type { Observable } from 'rxjs';
import { IconButtonGroup, type IconButtonGroupProps } from '@kbn/shared-ux-button-toolbar';
import { EuiFlexGroup, EuiFlexItem, EuiProgress } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  EmbeddableComponentProps,
  Suggestion,
  LensEmbeddableOutput,
} from '@kbn/lens-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { LensEmbeddableInput } from '@kbn/lens-plugin/public';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { Subject } from 'rxjs';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type { TextBasedPersistedState } from '@kbn/lens-plugin/public/datasources/text_based/types';
import { Histogram } from './histogram';
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
import { TimeIntervalSelector } from './time_interval_selector';
import { useTotalHits } from './hooks/use_total_hits';
import { useRequestParams } from './hooks/use_request_params';
import { useChartStyles } from './hooks/use_chart_styles';
import { useChartActions } from './hooks/use_chart_actions';
import { ChartConfigPanel } from './chart_config_panel';
import { getLensAttributes } from './utils/get_lens_attributes';
import { useRefetch } from './hooks/use_refetch';
import { useEditVisualization } from './hooks/use_edit_visualization';

export interface ChartProps {
  abortController?: AbortController;
  isChartAvailable: boolean;
  hiddenPanel?: boolean;
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
  renderCustomChartToggleActions?: () => ReactElement | undefined;
  appendHistogram?: ReactElement;
  disableAutoFetching?: boolean;
  disableTriggers?: LensEmbeddableInput['disableTriggers'];
  disabledActions?: LensEmbeddableInput['disabledActions'];
  input$?: UnifiedHistogramInput$;
  lensAdapters?: UnifiedHistogramChartLoadEvent['adapters'];
  lensEmbeddableOutput$?: Observable<LensEmbeddableOutput>;
  isOnHistogramMode?: boolean;
  histogramQuery?: AggregateQuery;
  isChartLoading?: boolean;
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
  isChartAvailable,
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
  renderCustomChartToggleActions,
  appendHistogram,
  disableAutoFetching,
  disableTriggers,
  disabledActions,
  input$: originalInput$,
  lensAdapters,
  lensEmbeddableOutput$,
  isOnHistogramMode,
  histogramQuery,
  isChartLoading,
  onChartHiddenChange,
  onTimeIntervalChange,
  onSuggestionChange,
  onBreakdownFieldChange,
  onTotalHitsChange,
  onChartLoad,
  onFilter,
  onBrushEnd,
  withDefaultActions,
  abortController,
}: ChartProps) {
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const { chartRef, toggleHideChart } = useChartActions({
    chart,
    onChartHiddenChange,
  });

  const chartVisible = isChartAvailable && !!chart && !chart.hidden;

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

  const { chartToolbarCss, histogramCss } = useChartStyles(chartVisible);

  const lensAttributesContext = useMemo(
    () =>
      getLensAttributes({
        title: chart?.title,
        filters,
        query: histogramQuery ?? query,
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
      histogramQuery,
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

  const a11yCommonProps = {
    id: 'unifiedHistogramCollapsablePanel',
  };

  if (Boolean(renderCustomChartToggleActions) && !chartVisible) {
    return <div {...a11yCommonProps} data-test-subj="unifiedHistogramChartPanelHidden" />;
  }

  const LensSaveModalComponent = services.lens.SaveModalComponent;
  const canSaveVisualization =
    chartVisible && currentSuggestion && services.capabilities.dashboard?.showWriteControls;
  const canEditVisualizationOnTheFly = currentSuggestion && chartVisible;

  const actions: IconButtonGroupProps['buttons'] = [];

  if (canEditVisualizationOnTheFly) {
    actions.push({
      label: i18n.translate('unifiedHistogram.editVisualizationButton', {
        defaultMessage: 'Edit visualization',
      }),
      iconType: 'pencil',
      isDisabled: isFlyoutVisible,
      'data-test-subj': 'unifiedHistogramEditFlyoutVisualization',
      onClick: () => setIsFlyoutVisible(true),
    });
  } else if (onEditVisualization) {
    actions.push({
      label: i18n.translate('unifiedHistogram.editVisualizationButton', {
        defaultMessage: 'Edit visualization',
      }),
      iconType: 'lensApp',
      'data-test-subj': 'unifiedHistogramEditVisualization',
      onClick: onEditVisualization,
    });
  }
  if (canSaveVisualization) {
    actions.push({
      label: i18n.translate('unifiedHistogram.saveVisualizationButton', {
        defaultMessage: 'Save visualization',
      }),
      iconType: 'save',
      'data-test-subj': 'unifiedHistogramSaveVisualization',
      onClick: () => setIsSaveModalVisible(true),
    });
  }

  const removeTables = (attributes: LensAttributes) => {
    if (!attributes.state.datasourceStates.textBased) {
      return attributes;
    }
    const layers = attributes.state.datasourceStates.textBased?.layers;

    const newState = {
      ...attributes,
      state: {
        ...attributes.state,
        datasourceStates: {
          ...attributes.state.datasourceStates,
          textBased: {
            ...(attributes.state.datasourceStates.textBased || {}),
            layers: {} as TextBasedPersistedState['layers'],
          },
        },
      },
    };

    if (layers) {
      for (const key of Object.keys(layers)) {
        const newLayer = { ...layers[key] };
        delete newLayer.table;
        newState.state.datasourceStates.textBased!.layers[key] = newLayer;
      }
    }

    return newState;
  };

  return (
    <EuiFlexGroup
      {...a11yCommonProps}
      className={className}
      direction="column"
      alignItems="stretch"
      gutterSize="none"
      responsive={false}
    >
      <EuiFlexItem grow={false} css={chartToolbarCss}>
        <EuiFlexGroup
          direction="row"
          gutterSize="s"
          responsive={false}
          alignItems="center"
          justifyContent="spaceBetween"
        >
          <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
            <EuiFlexGroup direction="row" gutterSize="s" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                {renderCustomChartToggleActions ? (
                  renderCustomChartToggleActions()
                ) : (
                  <IconButtonGroup
                    legend={i18n.translate('unifiedHistogram.hideChartButtongroupLegend', {
                      defaultMessage: 'Chart visibility',
                    })}
                    buttonSize="s"
                    buttons={[
                      {
                        label: chartVisible
                          ? i18n.translate('unifiedHistogram.hideChartButton', {
                              defaultMessage: 'Hide chart',
                            })
                          : i18n.translate('unifiedHistogram.showChartButton', {
                              defaultMessage: 'Show chart',
                            }),
                        iconType: chartVisible ? 'transitionTopOut' : 'transitionTopIn',
                        'data-test-subj': 'unifiedHistogramToggleChartButton',
                        onClick: toggleHideChart,
                      },
                    ]}
                  />
                )}
              </EuiFlexItem>
              {chartVisible && !isPlainRecord && !!onTimeIntervalChange && (
                <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
                  <TimeIntervalSelector chart={chart} onTimeIntervalChange={onTimeIntervalChange} />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
                <div>
                  {chartVisible && breakdown && (
                    <BreakdownFieldSelector
                      dataView={dataView}
                      breakdown={breakdown}
                      onBreakdownFieldChange={onBreakdownFieldChange}
                    />
                  )}
                  {chartVisible &&
                    currentSuggestion &&
                    allSuggestions &&
                    allSuggestions?.length > 1 && (
                      <SuggestionSelector
                        suggestions={allSuggestions}
                        activeSuggestion={currentSuggestion}
                        onSuggestionChange={onSuggestionSelectorChange}
                      />
                    )}
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {chartVisible && actions.length > 0 && (
            <EuiFlexItem grow={false}>
              <IconButtonGroup
                legend={i18n.translate('unifiedHistogram.chartActionsGroupLegend', {
                  defaultMessage: 'Chart actions',
                })}
                buttonSize="s"
                buttons={actions}
              />
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
            data-test-subj="unifiedHistogramRendered"
          >
            {isChartLoading && (
              <EuiProgress
                size="xs"
                color="accent"
                position="absolute"
                data-test-subj="unifiedHistogramProgressBar"
              />
            )}
            <HistogramMemoized
              abortController={abortController}
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
          initialInput={
            removeTables(lensAttributesContext.attributes) as unknown as LensEmbeddableInput
          }
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
            lensAdapters,
            lensEmbeddableOutput$,
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
