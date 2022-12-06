/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReactElement, useMemo } from 'react';
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
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
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

  const chartVisible = !!(
    chart &&
    !chart.hidden &&
    dataView.id &&
    dataView.type !== DataViewType.ROLLUP &&
    dataView.isTimeBased()
  );

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
      }),
    [breakdown?.field, chart?.timeInterval, chart?.title, dataView, filters, query]
  );

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
