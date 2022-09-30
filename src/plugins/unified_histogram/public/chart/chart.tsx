/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ReactElement } from 'react';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import moment from 'moment';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HitsCounter } from '../hits_counter';
import { Histogram } from './histogram';
import { useChartPanels } from './use_chart_panels';
import type {
  UnifiedHistogramContext,
  UnifiedHistogramServices,
  UnifiedHistogramStatus,
} from '../types';

export interface ChartProps {
  className?: string;
  services: UnifiedHistogramServices;
  status: UnifiedHistogramStatus;
  hits: number;
  histogram?: UnifiedHistogramContext;
  appendHitsCounter?: ReactElement;
  appendHistogram?: ReactElement;
  onEditVisualization?: () => void;
  onResetChartHeight?: () => void;
  onHideChartChange?: (hideChart: boolean) => void;
  onIntervalChange?: (interval: string) => void;
}

const HistogramMemoized = memo(Histogram);

export function Chart({
  className,
  services,
  status,
  hits,
  histogram,
  appendHitsCounter,
  appendHistogram,
  onEditVisualization,
  onResetChartHeight,
  onHideChartChange,
  onIntervalChange,
}: ChartProps) {
  const { data } = services;
  const [showChartOptionsPopover, setShowChartOptionsPopover] = useState(false);

  const chartRef = useRef<{ element: HTMLElement | null; moveFocus: boolean }>({
    element: null,
    moveFocus: false,
  });

  const onShowChartOptions = useCallback(() => {
    setShowChartOptionsPopover(!showChartOptionsPopover);
  }, [showChartOptionsPopover]);

  const closeChartOptions = useCallback(() => {
    setShowChartOptionsPopover(false);
  }, [setShowChartOptionsPopover]);

  useEffect(() => {
    if (chartRef.current.moveFocus && chartRef.current.element) {
      chartRef.current.element.focus();
    }
  }, [histogram?.hidden]);

  const toggleHideChart = useCallback(() => {
    const newHideChart = !histogram?.hidden;
    chartRef.current.moveFocus = !newHideChart;
    onHideChartChange?.(newHideChart);
  }, [histogram?.hidden, onHideChartChange]);

  const timefilterUpdateHandler = useCallback(
    (ranges: { from: number; to: number }) => {
      data.query.timefilter.timefilter.setTime({
        from: moment(ranges.from).toISOString(),
        to: moment(ranges.to).toISOString(),
        mode: 'absolute',
      });
    },
    [data]
  );

  const panels = useChartPanels({
    histogram,
    toggleHideChart,
    onChangeInterval: (newInterval) => onIntervalChange?.(newInterval),
    closePopover: () => setShowChartOptionsPopover(false),
    onResetChartHeight,
  });

  return (
    <EuiFlexGroup
      className={className}
      direction="column"
      alignItems="stretch"
      gutterSize="none"
      responsive={false}
    >
      <EuiFlexItem grow={false} className="unifiedHistogramResultCount">
        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" responsive={false}>
          <EuiFlexItem
            grow={false}
            className="unifiedHistogramResultCount__title eui-textTruncate eui-textNoWrap"
          >
            <HitsCounter hits={hits} status={status} append={appendHitsCounter} />
          </EuiFlexItem>
          {histogram && (
            <EuiFlexItem className="unifiedHistogramResultCount__toggle" grow={false}>
              <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
                {onEditVisualization && (
                  <EuiFlexItem grow={false}>
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
                <EuiFlexItem grow={false}>
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
                          onClick={onShowChartOptions}
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
      {histogram && !histogram.hidden && (
        <EuiFlexItem>
          <section
            ref={(element) => (chartRef.current.element = element)}
            tabIndex={-1}
            aria-label={i18n.translate('unifiedHistogram.histogramOfFoundDocumentsAriaLabel', {
              defaultMessage: 'Histogram of found documents',
            })}
            className="unifiedHistogramTimechart"
          >
            <HistogramMemoized
              services={services}
              status={status}
              histogram={histogram}
              timefilterUpdateHandler={timefilterUpdateHandler}
            />
          </section>
          {appendHistogram}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
