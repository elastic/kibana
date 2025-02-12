/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { Subject } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { IconButtonGroup, type IconButtonGroupProps } from '@kbn/shared-ux-button-toolbar';
import { EuiFlexGroup, EuiFlexItem, EuiProgress, EuiDelayRender } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  EmbeddableComponentProps,
  LensEmbeddableInput,
  LensEmbeddableOutput,
} from '@kbn/lens-plugin/public';
import type {
  Datatable,
  DatatableColumn,
  DefaultInspectorAdapters,
} from '@kbn/expressions-plugin/common';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { PublishingSubject } from '@kbn/presentation-publishing';
import { RequestStatus } from '@kbn/inspector-plugin/public';
import { IKibanaSearchResponse } from '@kbn/search-types';
import { estypes } from '@elastic/elasticsearch';
import { Histogram } from './histogram';
import {
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
  UnifiedHistogramBucketInterval,
} from '../types';
import { UnifiedHistogramSuggestionType } from '../types';
import { BreakdownFieldSelector } from './breakdown_field_selector';
import { TimeIntervalSelector } from './time_interval_selector';
import { useTotalHits } from './hooks/use_total_hits';
import { useChartStyles } from './hooks/use_chart_styles';
import { useChartActions } from './hooks/use_chart_actions';
import { ChartConfigPanel } from './chart_config_panel';
import { useFetch } from './hooks/use_fetch';
import { useEditVisualization } from './hooks/use_edit_visualization';
import { LensVisService } from '../services/lens_vis_service';
import type { UseRequestParamsResult } from '../hooks/use_request_params';
import { removeTablesFromLensAttributes } from '../utils/lens_vis_from_table';
import { useLensProps } from './hooks/use_lens_props';
import { useStableCallback } from '../hooks/use_stable_callback';
import { buildBucketInterval } from './utils/build_bucket_interval';

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
  disableTriggers?: LensEmbeddableInput['disableTriggers'];
  disabledActions?: LensEmbeddableInput['disabledActions'];
  input$?: UnifiedHistogramInput$;
  lensAdapters?: UnifiedHistogramChartLoadEvent['adapters'];
  dataLoading$?: LensEmbeddableOutput['dataLoading$'];
  isChartLoading?: boolean;
  onChartHiddenChange?: (chartHidden: boolean) => void;
  onTimeIntervalChange?: (timeInterval: string) => void;
  onBreakdownFieldChange?: (breakdownField: DataViewField | undefined) => void;
  onTotalHitsChange?: (status: UnifiedHistogramFetchStatus, result?: number | Error) => void;
  onChartLoad?: (event: UnifiedHistogramChartLoadEvent) => void;
  onFilter?: LensEmbeddableInput['onFilter'];
  onBrushEnd?: LensEmbeddableInput['onBrushEnd'];
  withDefaultActions: EmbeddableComponentProps['withDefaultActions'];
  columns?: DatatableColumn[];
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
  disableTriggers,
  disabledActions,
  input$: originalInput$,
  lensAdapters,
  dataLoading$,
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
  columns,
}: ChartProps) {
  const lensVisServiceCurrentSuggestionContext = useObservable(
    lensVisService.currentSuggestionContext$
  );
  const visContext = useObservable(lensVisService.visContext$);
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

  const fetch$ = useFetch({
    input$,
    beforeFetch: updateTimeRange,
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
    fetch$,
    onTotalHitsChange,
    isPlainRecord,
  });

  const [bucketInterval, setBucketInterval] = useState<UnifiedHistogramBucketInterval>();
  const onLoad = useStableCallback(
    (
      isLoading: boolean,
      adapters: Partial<DefaultInspectorAdapters> | undefined,
      dataLoadingSubject$?: PublishingSubject<boolean | undefined>
    ) => {
      const lensRequest = adapters?.requests?.getRequests()[0];
      const requestFailed = lensRequest?.status === RequestStatus.ERROR;
      const json = lensRequest?.response?.json as
        | IKibanaSearchResponse<estypes.SearchResponse>
        | undefined;
      const response = json?.rawResponse;

      if (requestFailed) {
        onTotalHitsChange?.(UnifiedHistogramFetchStatus.error, undefined);
        onChartLoad?.({ adapters: adapters ?? {} });
        return;
      }

      const adapterTables = adapters?.tables?.tables;
      const totalHits = computeTotalHits(hasLensSuggestions, adapterTables, isPlainRecord);

      if (response?._shards?.failed || response?.timed_out) {
        onTotalHitsChange?.(UnifiedHistogramFetchStatus.error, totalHits);
      } else {
        onTotalHitsChange?.(
          isLoading ? UnifiedHistogramFetchStatus.loading : UnifiedHistogramFetchStatus.complete,
          totalHits ?? hits?.total
        );
      }

      if (response) {
        const newBucketInterval = buildBucketInterval({
          data: services.data,
          dataView,
          timeInterval: chart?.timeInterval,
          timeRange: getTimeRange(),
          response,
        });

        setBucketInterval(newBucketInterval);
      }

      onChartLoad?.({ adapters: adapters ?? {}, dataLoading$: dataLoadingSubject$ });
    }
  );

  const lensPropsContext = useLensProps({
    request,
    getTimeRange,
    fetch$,
    visContext,
    onLoad,
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
    canEditVisualizationOnTheFly && services.capabilities.dashboard_v2?.showWriteControls;

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
                      esqlColumns={isPlainRecord ? columns : undefined}
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
              /*
                There are 2 different loaders which can appear above the chart. One is from the embeddable and one is from the UnifiedHistogram.
                The idea is to show UnifiedHistogram loader until we get a new query params which would trigger the embeddable loader.
                Updates to the time range can come earlier than the query updates which we delay on purpose for text based mode,
                this is why it might get both loaders. We should find a way to resolve that better.
              */
              <EuiDelayRender delay={500} data-test-subj="unifiedHistogramProgressBar">
                <EuiProgress size="xs" color="accent" position="absolute" />
              </EuiDelayRender>
            )}
            {lensPropsContext && (
              <HistogramMemoized
                abortController={abortController}
                services={services}
                dataView={dataView}
                chart={chart}
                bucketInterval={bucketInterval}
                getTimeRange={getTimeRange}
                visContext={visContext}
                isPlainRecord={isPlainRecord}
                disableTriggers={disableTriggers}
                disabledActions={disabledActions}
                onFilter={onFilter}
                onBrushEnd={onBrushEnd}
                withDefaultActions={withDefaultActions}
                {...lensPropsContext}
              />
            )}
          </section>
          {appendHistogram}
        </EuiFlexItem>
      )}
      {canSaveVisualization && isSaveModalVisible && visContext.attributes && (
        <LensSaveModalComponent
          initialInput={removeTablesFromLensAttributes(visContext.attributes)}
          onSave={() => {}}
          onClose={() => setIsSaveModalVisible(false)}
          isSaveable={false}
        />
      )}
      {isFlyoutVisible && !!visContext && !!lensVisServiceCurrentSuggestionContext && (
        <ChartConfigPanel
          services={services}
          visContext={visContext}
          lensAdapters={lensAdapters}
          dataLoading$={dataLoading$}
          isFlyoutVisible={isFlyoutVisible}
          setIsFlyoutVisible={setIsFlyoutVisible}
          isPlainRecord={isPlainRecord}
          query={query}
          currentSuggestionContext={lensVisServiceCurrentSuggestionContext}
          onSuggestionContextEdit={onSuggestionContextEdit}
        />
      )}
    </EuiFlexGroup>
  );
}

const computeTotalHits = (
  hasLensSuggestions: boolean,
  adapterTables:
    | {
        [key: string]: Datatable;
      }
    | undefined,
  isPlainRecord?: boolean
) => {
  if (isPlainRecord && hasLensSuggestions) {
    return Object.values(adapterTables ?? {})?.[0]?.rows?.length;
  } else if (isPlainRecord && !hasLensSuggestions) {
    // ES|QL histogram case
    const rows = Object.values(adapterTables ?? {})?.[0]?.rows;
    if (!rows) {
      return undefined;
    }
    let rowsCount = 0;
    rows.forEach((r) => {
      rowsCount += r.results;
    });
    return rowsCount;
  } else {
    return adapterTables?.unifiedHistogram?.meta?.statistics?.totalCount;
  }
};
