/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { IconButtonGroupProps } from '@kbn/shared-ux-button-toolbar';
import { EuiDelayRender, EuiProgress, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ApproximationBadge } from '@kbn/esql-browser';
import type {
  EmbeddableComponentProps,
  LensEmbeddableInput,
  LensEmbeddableOutput,
} from '@kbn/lens-plugin/public';
import type { Datatable, DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import { apiPublishesEsql } from '@kbn/presentation-publishing';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { RequestStatus } from '@kbn/inspector-plugin/public';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { estypes } from '@elastic/elasticsearch';
import { useStableCallback } from '@kbn/react-hooks';
import type { DataSource } from '@kbn/data-source';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import { Histogram } from './histogram';
import type {
  UnifiedHistogramBucketInterval,
  UnifiedHistogramChartContext,
  UnifiedHistogramChartLoadEvent,
  UnifiedHistogramFetch$,
  UnifiedHistogramFetchParams,
  UnifiedHistogramHitsContext,
  UnifiedHistogramLensActionsOptions,
  UnifiedHistogramServices,
  UnifiedHistogramSuggestionContext,
  LensVisServiceState,
} from '../../types';
import { UnifiedHistogramFetchStatus, UnifiedHistogramSuggestionType } from '../../types';
import { BreakdownFieldSelector } from './breakdown_field_selector';
import { TimeIntervalSelector } from './time_interval_selector';
import { useTotalHits } from './hooks/use_total_hits';
import { useChartStyles } from './hooks/use_chart_styles';
import { ChartConfigPanel } from './chart_config_panel';
import { useEditVisualization } from './hooks/use_edit_visualization';
import type { LensVisService } from '../../services/lens_vis_service';
import { removeTablesFromLensAttributes } from '../../utils/lens_vis_from_table';
import { useLensProps } from './hooks/use_lens_props';
import { buildBucketInterval } from './utils/build_bucket_interval';
import { ChartSectionTemplate } from './chart_section_template';
import {
  applyHistogramComparisonAttributes,
  canApplyHistogramComparison,
} from './histogram_comparison';
import {
  getHistogramBucket,
  HISTOGRAM_OVERLAY_COLUMN,
  HISTOGRAM_REMAINDER_COLUMN,
  splitHistogramTable,
  type HistogramComparisonCount,
} from './split_histogram_table';
import {
  HistogramComparisonBadge,
  type HistogramComparisonStatus,
} from './histogram_comparison_badge';

export interface UnifiedHistogramChartProps {
  isChartAvailable: boolean;
  hiddenPanel?: boolean;
  services: UnifiedHistogramServices;
  lensVisService: LensVisService;
  lensVisServiceState: LensVisServiceState;
  hits: UnifiedHistogramHitsContext | undefined;
  chart: UnifiedHistogramChartContext | undefined;
  renderToggleActions: () => ReactElement | undefined;
  disableTriggers?: LensEmbeddableInput['disableTriggers'];
  disabledActions?: LensEmbeddableInput['disabledActions'];
  fetch$: UnifiedHistogramFetch$;
  fetchParams: UnifiedHistogramFetchParams;
  lensAdapters: UnifiedHistogramChartLoadEvent['adapters'] | undefined;
  dataLoading$: LensEmbeddableOutput['dataLoading$'] | undefined;
  isChartLoading?: boolean;
  onChartHiddenChange?: (chartHidden: boolean) => void;
  onTimeIntervalChange?: (timeInterval: string) => void;
  onBreakdownFieldChange?: (breakdownField: DataViewField | undefined) => void;
  onTotalHitsChange?: (status: UnifiedHistogramFetchStatus, result?: number | Error) => void;
  onChartLoad?: (event: UnifiedHistogramChartLoadEvent) => void;
  onFilter?: LensEmbeddableInput['onFilter'];
  onBrushEnd?: LensEmbeddableInput['onBrushEnd'];
  withDefaultActions?: EmbeddableComponentProps['withDefaultActions'];
  withLensActions?: boolean;
  lensActionsOptions?: UnifiedHistogramLensActionsOptions;
  onApiAvailable?: EmbeddableComponentProps['onApiAvailable'];
  /**
   * Selected subset counted on the histogram's own buckets and drawn as a stacked bar.
   */
  comparison?: {
    key: string;
    /**
     * Legend name of the selected series.
     */
    label: string;
    /**
     * Full description of the selection, shown in the toolbar badge.
     */
    description: string;
    /**
     * Counts the subset with the request params that produced the loaded histogram.
     * Buckets `timeField` by `interval` and returns each bucket keyed by `timeColumn`.
     */
    loadCounts: (params: {
      fetchParams: UnifiedHistogramFetchParams;
      timeField: string;
      timeColumn: string;
      interval: string;
      signal: AbortSignal;
    }) => Promise<HistogramComparisonCount[]>;
    onClear: () => void;
  };
}

interface LoadedHistogram {
  table: Datatable;
  fetchParams: UnifiedHistogramFetchParams;
}

const RequestStatusError: typeof RequestStatus.ERROR = 2;
const otherDocumentsLabel = i18n.translate('unifiedHistogram.comparison.otherDocuments', {
  defaultMessage: 'Other documents',
});
const HistogramMemoized = memo(Histogram);

export function UnifiedHistogramChart({
  isChartAvailable,
  services,
  hits,
  chart,
  lensVisService,
  lensVisServiceState,
  renderToggleActions,
  fetch$,
  fetchParams,
  lensAdapters,
  dataLoading$,
  isChartLoading,
  onChartHiddenChange,
  onTimeIntervalChange,
  onBreakdownFieldChange,
  onTotalHitsChange,
  onChartLoad,
  onApiAvailable: consumerOnApiAvailable,
  comparison,
  withLensActions = true,
  lensActionsOptions,
  ...histogramProps
}: UnifiedHistogramChartProps) {
  const { euiTheme } = useEuiTheme();
  const lensVisServiceCurrentSuggestionContext = lensVisServiceState.currentSuggestionContext;
  const visContext = lensVisServiceState.visContext;
  const currentSuggestion = lensVisServiceCurrentSuggestionContext?.suggestion;

  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const [isApproximationApplied, setIsApproximationApplied] = useState(false);
  const approximationSubscription = useRef<{ unsubscribe: () => void } | undefined>(undefined);

  useEffect(() => {
    return () => approximationSubscription.current?.unsubscribe();
  }, []);

  const onApiAvailable = useCallback(
    (api: unknown) => {
      approximationSubscription.current?.unsubscribe();
      if (apiPublishesEsql(api)) {
        approximationSubscription.current = api.approximationApplied$.subscribe((value) => {
          setIsApproximationApplied(Boolean(value));
        });
      }
      consumerOnApiAvailable?.(api);
    },
    [consumerOnApiAvailable]
  );

  const chartVisible =
    isChartAvailable && !!chart && !chart.hidden && !!visContext && !!visContext?.attributes;

  const lensSaveModalInitialInput = useMemo(() => {
    if (!visContext?.attributes) {
      return undefined;
    }
    const withTablesRemoved = removeTablesFromLensAttributes(visContext.attributes);
    return {
      ...withTablesRemoved,
      attributes: {
        ...withTablesRemoved.attributes,
        title: '',
      },
    };
  }, [visContext?.attributes]);

  const {
    dataSource,
    query,
    timeRange,
    relativeTimeRange,
    abortController,
    controlsState,
    breakdown,
  } = fetchParams;
  const isEsql = dataSource.kind === 'esql';
  const hasLensSuggestions = Boolean(
    isEsql &&
      lensVisServiceCurrentSuggestionContext?.type === UnifiedHistogramSuggestionType.lensSuggestion
  );
  useTotalHits({
    services,
    hits,
    chartVisible,
    fetch$,
    abortController,
    onTotalHitsChange,
  });

  const [bucketInterval, setBucketInterval] = useState<UnifiedHistogramBucketInterval>();
  const [loadedHistogram, setLoadedHistogram] = useState<LoadedHistogram>();
  const [comparisonAttributes, setComparisonAttributes] = useState<{
    key: string;
    histogram: LoadedHistogram;
    attributes: LensAttributes;
  }>();
  const [comparisonStatus, setComparisonStatus] = useState<{
    key: string;
    status: HistogramComparisonStatus;
  }>();
  // Lens keeps the `onLoad` it was mounted with, so each load is attributed to what was last rendered.
  const renderedLensRef = useRef<{
    fetchParams: UnifiedHistogramFetchParams | undefined;
    isComparison: boolean;
  }>({ fetchParams: undefined, isComparison: false });
  const onLoad = useStableCallback(
    (
      isLoading: boolean,
      adapters: Partial<DefaultInspectorAdapters> | undefined,
      dataLoadingSubject$?: PublishingSubject<boolean | undefined>
    ) => {
      const { fetchParams: loadFetchParams, isComparison } = renderedLensRef.current;
      if (isComparison) {
        return;
      }

      const lensRequest = adapters?.requests?.getRequests()[0];
      const requestFailed = lensRequest?.status === RequestStatusError;
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
      const totalHits = computeTotalHits(hasLensSuggestions, adapterTables, dataSource);

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
          dataSource,
          timeInterval: chart?.timeInterval,
          timeRange,
          response,
        });

        setBucketInterval(newBucketInterval);
      }

      onChartLoad?.({ adapters: adapters ?? {}, dataLoading$: dataLoadingSubject$ });

      if (!isLoading && loadFetchParams === fetchParams) {
        const table = Object.values(adapterTables ?? {})[0];
        const columnIds = new Set(table?.columns.map((column) => column.id));
        // A comparison completion can arrive after Compare is cleared. Saving it would split it again.
        const isComparisonTable =
          columnIds.has(HISTOGRAM_OVERLAY_COLUMN) && columnIds.has(HISTOGRAM_REMAINDER_COLUMN);
        if (!isComparisonTable) {
          setLoadedHistogram(table ? { table, fetchParams: loadFetchParams } : undefined);
        }
      }
    }
  );

  const lensPropsContext = useLensProps({
    fetch$,
    onLoad,
  });
  // `fetchParams` is replaced on every fetch, so identity ties the table to the current request.
  const currentHistogram =
    loadedHistogram?.fetchParams === fetchParams ? loadedHistogram : undefined;
  const comparisonLensProps = useMemo(() => {
    if (
      !lensPropsContext ||
      !comparison ||
      comparisonAttributes?.key !== comparison.key ||
      comparisonAttributes.histogram !== currentHistogram
    ) {
      return;
    }
    return { ...lensPropsContext.lensProps, attributes: comparisonAttributes.attributes };
  }, [comparison, comparisonAttributes, currentHistogram, lensPropsContext]);
  renderedLensRef.current = {
    fetchParams: lensPropsContext?.fetchParams,
    isComparison: Boolean(comparisonLensProps),
  };

  const baseAttributes = lensPropsContext?.lensProps.attributes;
  const overlayColor = euiTheme.colors.vis.euiColorVis8;
  const remainderColor = euiTheme.colors.vis.euiColorVis0;
  useEffect(() => {
    if (!comparison) {
      return;
    }

    const { key, label, loadCounts } = comparison;
    const reportStatus = (status: HistogramComparisonStatus) =>
      setComparisonStatus({ key, status });
    if (!currentHistogram || !baseAttributes) {
      reportStatus('loading');
      return;
    }

    const bucket = getHistogramBucket(currentHistogram.table);
    const { timeFieldName } = currentHistogram.fetchParams.dataSource;
    if (
      !bucket ||
      !timeFieldName ||
      currentHistogram.fetchParams.breakdown?.field ||
      !canApplyHistogramComparison(baseAttributes)
    ) {
      reportStatus('unavailable');
      return;
    }

    reportStatus('loading');
    const controller = new AbortController();
    loadCounts({
      fetchParams: currentHistogram.fetchParams,
      timeField: timeFieldName,
      ...bucket,
      signal: controller.signal,
    })
      .then((counts) => {
        if (controller.signal.aborted) {
          return;
        }
        const split = splitHistogramTable({
          table: currentHistogram.table,
          timeColumn: bucket.timeColumn,
          counts,
          label,
          remainderLabel: otherDocumentsLabel,
        });
        const attributes =
          split &&
          applyHistogramComparisonAttributes({
            attributes: baseAttributes,
            table: split.table,
            colors: { overlay: overlayColor, remainder: remainderColor },
          });
        if (!split || !attributes) {
          reportStatus('unavailable');
          return;
        }
        setComparisonAttributes({ key, histogram: currentHistogram, attributes });
        reportStatus(split.approximate ? 'approximate' : 'applied');
      })
      .catch((error: { name?: string }) => {
        if (!controller.signal.aborted && error?.name !== 'AbortError') {
          reportStatus('unavailable');
        }
      });

    return () => {
      controller.abort();
      setComparisonAttributes(undefined);
    };
  }, [baseAttributes, comparison, currentHistogram, overlayColor, remainderColor]);

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
    dataSource,
    relativeTimeRange,
    lensAttributes: visContext?.attributes,
    lensEditorOptions: lensActionsOptions?.navigation,
  });

  const toolbarToggleActions = useMemo(() => renderToggleActions(), [renderToggleActions]);

  const toolbarSelectors = useMemo(
    () => [
      chartVisible && !isEsql && !!onTimeIntervalChange ? (
        <TimeIntervalSelector chart={chart} onTimeIntervalChange={onTimeIntervalChange} />
      ) : null,
      <div>
        {chartVisible && breakdown && (
          <BreakdownFieldSelector
            dataSource={dataSource}
            breakdown={breakdown}
            onBreakdownFieldChange={onBreakdownFieldChange}
          />
        )}
      </div>,
      chartVisible && comparison ? (
        <HistogramComparisonBadge
          description={comparison.description}
          status={comparisonStatus?.key === comparison.key ? comparisonStatus.status : 'loading'}
          onClear={comparison.onClear}
        />
      ) : null,
    ],
    [
      chartVisible,
      isEsql,
      onTimeIntervalChange,
      chart,
      breakdown,
      dataSource,
      onBreakdownFieldChange,
      comparison,
      comparisonStatus,
    ]
  );

  const a11yCommonProps = {
    id: 'unifiedHistogramCollapsablePanel',
  };

  if (!chartVisible) {
    return <div {...a11yCommonProps} data-test-subj="unifiedHistogramChartPanelHidden" />;
  }

  const LensSaveModalComponent = services.lens.SaveModalComponent;

  const canCustomizeVisualization =
    isEsql &&
    currentSuggestion &&
    [
      UnifiedHistogramSuggestionType.lensSuggestion,
      UnifiedHistogramSuggestionType.histogramForESQL,
    ].includes(lensVisServiceCurrentSuggestionContext?.type);

  const canEditVisualizationOnTheFly = canCustomizeVisualization && chartVisible;
  const canSaveVisualization =
    canEditVisualizationOnTheFly && services.capabilities.dashboard_v2?.showWriteControls;

  const actions: IconButtonGroupProps['buttons'] = [];

  if (withLensActions && canEditVisualizationOnTheFly) {
    const editLabel = i18n.translate('unifiedHistogram.editVisualizationButton', {
      defaultMessage: 'Edit visualization',
    });
    actions.push({
      label: editLabel,
      toolTipContent: editLabel,
      iconType: 'pencil',
      isDisabled: isFlyoutVisible,
      'data-test-subj': 'unifiedHistogramEditFlyoutVisualization',
      onClick: () => setIsFlyoutVisible(true),
    });
  } else if (withLensActions && onEditVisualization) {
    const editLabel = i18n.translate('unifiedHistogram.editVisualizationButton', {
      defaultMessage: 'Edit visualization',
    });
    actions.push({
      label: editLabel,
      toolTipContent: editLabel,
      iconType: 'lensApp',
      'data-test-subj': 'unifiedHistogramEditVisualization',
      onClick: onEditVisualization,
    });
  }

  if (withLensActions && canSaveVisualization) {
    const saveLabel = i18n.translate('unifiedHistogram.saveVisualizationButton', {
      defaultMessage: 'Save visualization to dashboard',
    });
    actions.push({
      label: saveLabel,
      toolTipContent: saveLabel,
      iconType: 'addToDashboard',
      'data-test-subj': 'unifiedHistogramSaveVisualization',
      onClick: () => setIsSaveModalVisible(true),
    });
  }

  return (
    <>
      <ChartSectionTemplate
        {...a11yCommonProps}
        toolbarCss={chartToolbarCss}
        toolbar={{
          toggleActions: toolbarToggleActions,
          leftSide: toolbarSelectors,
          rightSide: chartVisible ? actions : [],
          additionalControls: {
            prependRight: (
              <span style={{ marginRight: 4 }}>
                <ApproximationBadge
                  isApproximationApplied={chartVisible && isApproximationApplied}
                  data-test-subj="unifiedHistogramApproximationApplied"
                />
              </span>
            ),
          },
        }}
      >
        {chartVisible && (
          <>
            <section
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
                  services={services}
                  dataSource={dataSource}
                  chart={chart}
                  bucketInterval={bucketInterval}
                  visContext={visContext}
                  abortController={abortController}
                  {...histogramProps}
                  {...lensPropsContext}
                  {...(comparisonLensProps ? { lensProps: comparisonLensProps } : undefined)}
                  onApiAvailable={onApiAvailable}
                />
              )}
            </section>
            <EuiSpacer size="s" />
          </>
        )}
      </ChartSectionTemplate>
      {canSaveVisualization && isSaveModalVisible && lensSaveModalInitialInput && (
        <LensSaveModalComponent
          initialInput={lensSaveModalInitialInput}
          onSave={() => {}}
          onClose={() => setIsSaveModalVisible(false)}
          isSaveable={false}
          controlsState={controlsState}
          telemetrySource={lensActionsOptions?.telemetrySource}
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
          dataSource={dataSource}
          query={query}
          currentSuggestionContext={lensVisServiceCurrentSuggestionContext}
          onSuggestionContextEdit={onSuggestionContextEdit}
          isApproximate={fetchParams.isApproximate}
        />
      )}
    </>
  );
}

const computeTotalHits = (
  hasLensSuggestions: boolean,
  adapterTables:
    | {
        [key: string]: Datatable;
      }
    | undefined,
  dataSource: DataSource
) => {
  const isEsql = dataSource.kind === 'esql';
  if (isEsql && hasLensSuggestions) {
    return Object.values(adapterTables ?? {})?.[0]?.rows?.length;
  } else if (isEsql && !hasLensSuggestions) {
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
