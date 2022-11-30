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
  useEuiBreakpoint,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { HitsCounter } from '../hits_counter';
import { Histogram } from './histogram';
import { useChartPanels } from './use_chart_panels';
import type {
  UnifiedHistogramChartContext,
  UnifiedHistogramHitsContext,
  UnifiedHistogramServices,
} from '../types';

export interface ChartProps {
  className?: string;
  services: UnifiedHistogramServices;
  hits?: UnifiedHistogramHitsContext;
  chart?: UnifiedHistogramChartContext;
  appendHitsCounter?: ReactElement;
  appendHistogram?: ReactElement;
  onEditVisualization?: () => void;
  onResetChartHeight?: () => void;
  onChartHiddenChange?: (chartHidden: boolean) => void;
  onTimeIntervalChange?: (timeInterval: string) => void;
}

const HistogramMemoized = memo(Histogram);

export function Chart({
  className,
  services,
  hits,
  chart,
  appendHitsCounter,
  appendHistogram,
  onEditVisualization,
  onResetChartHeight,
  onChartHiddenChange,
  onTimeIntervalChange,
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
  }, [chart?.hidden]);

  const toggleHideChart = useCallback(() => {
    const chartHidden = !chart?.hidden;
    chartRef.current.moveFocus = !chartHidden;
    onChartHiddenChange?.(chartHidden);
  }, [chart?.hidden, onChartHiddenChange]);

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
    chart,
    toggleHideChart,
    onTimeIntervalChange: (timeInterval) => onTimeIntervalChange?.(timeInterval),
    closePopover: () => setShowChartOptionsPopover(false),
    onResetChartHeight,
  });

  const { euiTheme } = useEuiTheme();
  const resultCountCss = css`
    padding: ${euiTheme.size.s};
    min-height: ${euiTheme.base * 3}px;
  `;
  const resultCountTitleCss = css`
    ${useEuiBreakpoint(['xs', 's'])} {
      margin-bottom: 0 !important;
    }
  `;
  const resultCountToggleCss = css`
    ${useEuiBreakpoint(['xs', 's'])} {
      align-items: flex-end;
    }
  `;
  const timechartCss = css`
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    position: relative;

    // SASSTODO: the visualizing component should have an option or a modifier
    .series > rect {
      fill-opacity: 0.5;
      stroke-width: 1;
    }
  `;

  return (
    <EuiFlexGroup
      className={className}
      direction="column"
      alignItems="stretch"
      gutterSize="none"
      responsive={false}
    >
      <EuiFlexItem grow={false} css={resultCountCss}>
        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" responsive={false}>
          <EuiFlexItem
            grow={false}
            className="eui-textTruncate eui-textNoWrap"
            css={resultCountTitleCss}
          >
            {hits && <HitsCounter hits={hits} append={appendHitsCounter} />}
          </EuiFlexItem>
          {chart && (
            <EuiFlexItem grow={false} css={resultCountToggleCss}>
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
      {chart && !chart.hidden && (
        <EuiFlexItem>
          <section
            ref={(element) => (chartRef.current.element = element)}
            tabIndex={-1}
            aria-label={i18n.translate('unifiedHistogram.histogramOfFoundDocumentsAriaLabel', {
              defaultMessage: 'Histogram of found documents',
            })}
            css={timechartCss}
          >
            <HistogramMemoized
              services={services}
              chart={chart}
              timefilterUpdateHandler={timefilterUpdateHandler}
            />
          </section>
          {appendHistogram}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
