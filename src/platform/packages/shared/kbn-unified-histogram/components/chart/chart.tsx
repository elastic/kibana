/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { IconButtonGroup, type IconButtonGroupProps } from '@kbn/shared-ux-button-toolbar';
import { EuiDelayRender, EuiProgress, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  EmbeddableComponentProps,
  LensEmbeddableInput,
  LensEmbeddableOutput,
} from '@kbn/lens-plugin/public';
import type { Datatable, DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { RequestStatus } from '@kbn/inspector-plugin/public';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { estypes } from '@elastic/elasticsearch';
import { Histogram } from './histogram';
import type {
  UnifiedHistogramBucketInterval,
  UnifiedHistogramChartContext,
  UnifiedHistogramChartLoadEvent,
  UnifiedHistogramFetch$,
  UnifiedHistogramFetchParams,
  UnifiedHistogramHitsContext,
  UnifiedHistogramServices,
  UnifiedHistogramSuggestionContext,
  LensVisServiceState,
} from '../../types';
import { UnifiedHistogramFetchStatus, UnifiedHistogramSuggestionType } from '../../types';
import { BreakdownFieldSelector } from './breakdown_field_selector';
import { TimeIntervalSelector } from './time_interval_selector';
import { useTotalHits } from './hooks/use_total_hits';
import { useChartStyles } from './hooks/use_chart_styles';
import { useChartActions } from './hooks/use_chart_actions';
import { ChartConfigPanel } from './chart_config_panel';
import { useEditVisualization } from './hooks/use_edit_visualization';
import type { LensVisService } from '../../services/lens_vis_service';
import { removeTablesFromLensAttributes } from '../../utils/lens_vis_from_table';
import { useLensProps } from './hooks/use_lens_props';
import { useStableCallback } from '../../hooks/use_stable_callback';
import { buildBucketInterval } from './utils/build_bucket_interval';
import { ChartSectionTemplate } from './chart_section_template';

export interface UnifiedHistogramChartProps {
  isChartAvailable: boolean;
  hiddenPanel?: boolean;
  services: UnifiedHistogramServices;
  lensVisService: LensVisService;
  lensVisServiceState: LensVisServiceState;
  hits: UnifiedHistogramHitsContext | undefined;
  chart: UnifiedHistogramChartContext | undefined;
  renderCustomChartToggleActions?: () => ReactElement | undefined;
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
}

const RequestStatusError: typeof RequestStatus.ERROR = 2;
const HistogramMemoized = memo(Histogram);

export function UnifiedHistogramChart({
  isChartAvailable,
  services,
  hits,
  chart,
  lensVisService,
  lensVisServiceState,
  renderCustomChartToggleActions,
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
  ...histogramProps
}: UnifiedHistogramChartProps) {
  const lensVisServiceCurrentSuggestionContext = lensVisServiceState.currentSuggestionContext;
  const visContext = lensVisServiceState.visContext;
  const currentSuggestion = lensVisServiceCurrentSuggestionContext?.suggestion;

  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const { chartRef, toggleHideChart } = useChartActions({
    chart,
    onChartHiddenChange,
  });

  const chartVisible =
    isChartAvailable && !!chart && !chart.hidden && !!visContext && !!visContext?.attributes;

  const {
    dataView,
    query,
    timeRange,
    relativeTimeRange,
    abortController,
    columns,
    controlsState,
    isESQLQuery: isPlainRecord,
    breakdown,
  } = fetchParams;
  const hasLensSuggestions = Boolean(
    isPlainRecord &&
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
  const onLoad = useStableCallback(
    (
      isLoading: boolean,
      adapters: Partial<DefaultInspectorAdapters> | undefined,
      dataLoadingSubject$?: PublishingSubject<boolean | undefined>
    ) => {
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
          timeRange,
          response,
        });

        setBucketInterval(newBucketInterval);
      }

      onChartLoad?.({ adapters: adapters ?? {}, dataLoading$: dataLoadingSubject$ });
    }
  );

  const lensPropsContext = useLensProps({
    fetch$,
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
    relativeTimeRange,
    lensAttributes: visContext?.attributes,
    isPlainRecord,
  });

  const toolbarToggleActions = useMemo(
    () =>
      renderCustomChartToggleActions ? (
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
      ),
    [chartVisible, toggleHideChart, renderCustomChartToggleActions]
  );

  const toolbarSelectors = useMemo(
    () => [
      ,
      chartVisible && !isPlainRecord && !!onTimeIntervalChange ? (
        <TimeIntervalSelector chart={chart} onTimeIntervalChange={onTimeIntervalChange} />
      ) : null,
      <div>
        {chartVisible && breakdown && (
          <BreakdownFieldSelector
            dataView={dataView}
            breakdown={breakdown}
            onBreakdownFieldChange={onBreakdownFieldChange}
            esqlColumns={isPlainRecord ? columns : undefined}
          />
        )}
      </div>,
    ],
    [
      chartVisible,
      isPlainRecord,
      onTimeIntervalChange,
      chart,
      breakdown,
      dataView,
      onBreakdownFieldChange,
      columns,
    ]
  );

  const a11yCommonProps = {
    id: 'unifiedHistogramCollapsablePanel',
  };

  if (Boolean(renderCustomChartToggleActions) && !chartVisible) {
    return <div {...a11yCommonProps} data-test-subj="unifiedHistogramChartPanelHidden" />;
  }

  const LensSaveModalComponent = services.lens.SaveModalComponent;

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
    <>
      <ChartSectionTemplate
        {...a11yCommonProps}
        toolbarCss={chartToolbarCss}
        toolbar={{
          toggleActions: toolbarToggleActions,
          leftSide: toolbarSelectors,
          rightSide: chartVisible ? actions : [],
        }}
      >
        {chartVisible && (
          <>
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
                  services={services}
                  dataView={dataView}
                  chart={chart}
                  bucketInterval={bucketInterval}
                  visContext={visContext}
                  isPlainRecord={isPlainRecord}
                  abortController={abortController}
                  {...histogramProps}
                  {...lensPropsContext}
                />
              )}
            </section>
            <EuiSpacer size="s" />
          </>
        )}
      </ChartSectionTemplate>
      {canSaveVisualization && isSaveModalVisible && visContext.attributes && (
        <LensSaveModalComponent
          initialInput={removeTablesFromLensAttributes(visContext.attributes)}
          onSave={() => {}}
          onClose={() => setIsSaveModalVisible(false)}
          isSaveable={false}
          controlsState={controlsState}
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
