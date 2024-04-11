/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import type { Observable } from 'rxjs';
import { Subject } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { IconButtonGroup, type IconButtonGroupProps } from '@kbn/shared-ux-button-toolbar';
import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiDelayRender } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  EmbeddableComponentProps,
  LensEmbeddableInput,
  LensEmbeddableOutput,
  Suggestion,
} from '@kbn/lens-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { Histogram } from './histogram';
import type {
  UnifiedHistogramSuggestionContext,
  UnifiedHistogramBreakdownContext,
  UnifiedHistogramChartContext,
  UnifiedHistogramChartLoadEvent,
  UnifiedHistogramFetchStatus,
  UnifiedHistogramHitsContext,
  UnifiedHistogramInput$,
  UnifiedHistogramInputMessage,
  UnifiedHistogramRequestContext,
  UnifiedHistogramServices,
} from '../types';
import { UnifiedHistogramSuggestionType } from '../types';
import { BreakdownFieldSelector } from './breakdown_field_selector';
import { SuggestionSelector } from './suggestion_selector';
import { TimeIntervalSelector } from './time_interval_selector';
import { useTotalHits } from './hooks/use_total_hits';
import { useChartStyles } from './hooks/use_chart_styles';
import { useChartActions } from './hooks/use_chart_actions';
import { ChartConfigPanel } from './chart_config_panel';
import { useRefetch } from './hooks/use_refetch';
import { useEditVisualization } from './hooks/use_edit_visualization';
import { LensVisService } from '../services/lens_vis_service';
import type { UseRequestParamsResult } from '../hooks/use_request_params';
import { removeTablesFromLensAttributes } from '../utils/lens_vis_from_table';

export interface ChartProps {
  abortController?: AbortController;
  isChartAvailable: boolean;
  hiddenPanel?: boolean;
  className?: string;
  services: UnifiedHistogramServices;
  dataView: DataView;
  requestParams: UseRequestParamsResult;
  isPlainRecord?: boolean;
  lensVisService: LensVisService;
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
  isChartLoading?: boolean;
  onChartHiddenChange?: (chartHidden: boolean) => void;
  onTimeIntervalChange?: (timeInterval: string) => void;
  onBreakdownFieldChange?: (breakdownField: DataViewField | undefined) => void;
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
  requestParams,
  relativeTimeRange: originalRelativeTimeRange,
  request,
  hits,
  chart,
  breakdown,
  lensVisService,
  isPlainRecord,
  renderCustomChartToggleActions,
  appendHistogram,
  disableAutoFetching,
  disableTriggers,
  disabledActions,
  input$: originalInput$,
  lensAdapters,
  lensEmbeddableOutput$,
  isChartLoading,
  onChartHiddenChange,
  onTimeIntervalChange,
  onBreakdownFieldChange,
  onTotalHitsChange,
  onChartLoad,
  onFilter,
  onBrushEnd,
  withDefaultActions,
  abortController,
}: ChartProps) {
  const lensVisServiceCurrentSuggestionContext = useObservable(
    lensVisService.currentSuggestionContext$
  );
  const visContext = useObservable(lensVisService.visContext$);
  const allSuggestions = useObservable(lensVisService.allSuggestions$);
  const currentSuggestion = lensVisServiceCurrentSuggestionContext?.suggestion;

  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const { chartRef, toggleHideChart } = useChartActions({
    chart,
    onChartHiddenChange,
  });

  const chartVisible =
    isChartAvailable && !!chart && !chart.hidden && !!visContext && !!visContext?.attributes;

  const input$ = useMemo(
    () => originalInput$ ?? new Subject<UnifiedHistogramInputMessage>(),
    [originalInput$]
  );

  const { filters, query, getTimeRange, updateTimeRange, relativeTimeRange } = requestParams;

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

  const onSuggestionContextEdit = useCallback(
    (editedSuggestionContext: UnifiedHistogramSuggestionContext | undefined) => {
      lensVisService.onSuggestionEdited({
        editedSuggestionContext,
      });
    },
    [lensVisService]
  );

  const onSuggestionSelectorChange = useCallback(
    (suggestion: Suggestion | undefined) => {
      setIsFlyoutVisible(false);
      onSuggestionContextEdit({
        suggestion,
        type: UnifiedHistogramSuggestionType.lensSuggestion,
      });
    },
    [onSuggestionContextEdit, setIsFlyoutVisible]
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
    lensAttributes: visContext?.attributes,
    isPlainRecord,
  });

  const a11yCommonProps = {
    id: 'unifiedHistogramCollapsablePanel',
  };

  if (Boolean(renderCustomChartToggleActions) && !chartVisible) {
    return <div {...a11yCommonProps} data-test-subj="unifiedHistogramChartPanelHidden" />;
  }

  const LensSaveModalComponent = services.lens.SaveModalComponent;
  const hasLensSuggestions = Boolean(
    isPlainRecord &&
      lensVisServiceCurrentSuggestionContext?.type === UnifiedHistogramSuggestionType.lensSuggestion
  );

  const canCustomizeVisualization =
    isPlainRecord &&
    currentSuggestion &&
    [
      UnifiedHistogramSuggestionType.lensSuggestion,
      UnifiedHistogramSuggestionType.histogramForESQL,
    ].includes(lensVisServiceCurrentSuggestionContext?.type);

  const canEditVisualizationOnTheFly = canCustomizeVisualization && chartVisible;
  const canSaveVisualization =
    canEditVisualizationOnTheFly && services.capabilities.dashboard?.showWriteControls;

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
              <EuiDelayRender delay={500}>
                <EuiProgress
                  size="xs"
                  color="accent"
                  position="absolute"
                  data-test-subj="unifiedHistogramProgressBar"
                />
              </EuiDelayRender>
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
              visContext={visContext}
              isPlainRecord={isPlainRecord}
              disableTriggers={disableTriggers}
              disabledActions={disabledActions}
              onTotalHitsChange={onTotalHitsChange}
              hasLensSuggestions={hasLensSuggestions}
              onChartLoad={onChartLoad}
              onFilter={onFilter}
              onBrushEnd={onBrushEnd}
              withDefaultActions={withDefaultActions}
            />
          </section>
          {appendHistogram}
        </EuiFlexItem>
      )}
      {canSaveVisualization && isSaveModalVisible && visContext.attributes && (
        <LensSaveModalComponent
          initialInput={
            removeTablesFromLensAttributes(visContext.attributes) as unknown as LensEmbeddableInput
          }
          onSave={() => {}}
          onClose={() => setIsSaveModalVisible(false)}
          isSaveable={false}
        />
      )}
      {isFlyoutVisible && !!visContext && !!lensVisServiceCurrentSuggestionContext && (
        <ChartConfigPanel
          {...{
            services,
            visContext,
            lensAdapters,
            lensEmbeddableOutput$,
            isFlyoutVisible,
            setIsFlyoutVisible,
            isPlainRecord,
            query,
            currentSuggestionContext: lensVisServiceCurrentSuggestionContext,
            onSuggestionContextChange: onSuggestionContextEdit,
          }}
        />
      )}
    </EuiFlexGroup>
  );
}
