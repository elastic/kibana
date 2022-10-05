/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiSpacer, useEuiTheme, useIsWithinBreakpoints } from '@elastic/eui';
import type { PropsWithChildren, ReactElement, RefObject } from 'react';
import React, { useMemo } from 'react';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import { css } from '@emotion/css';
import { Chart } from '../chart';
import { Panels, PANELS_MODE } from '../panels';
import type {
  UnifiedHistogramChartContext,
  UnifiedHistogramServices,
  UnifiedHistogramHitsContext,
} from '../types';

export interface UnifiedHistogramLayoutProps extends PropsWithChildren<unknown> {
  className?: string;
  services: UnifiedHistogramServices;
  hits: UnifiedHistogramHitsContext;
  chart?: UnifiedHistogramChartContext;
  resizeRef: RefObject<HTMLDivElement>;
  topPanelHeight?: number;
  appendHitsCounter?: ReactElement;
  onTopPanelHeightChange?: (height: number) => void;
  onEditVisualization?: () => void;
  onResetChartHeight?: () => void;
  onHideChartChange?: (hideChart: boolean) => void;
  onTimeIntervalChange?: (timeInterval: string) => void;
}

export const UnifiedHistogramLayout = ({
  className,
  services,
  hits,
  chart,
  resizeRef,
  topPanelHeight,
  appendHitsCounter,
  onTopPanelHeightChange,
  onEditVisualization,
  onResetChartHeight,
  onHideChartChange,
  onTimeIntervalChange,
  children,
}: UnifiedHistogramLayoutProps) => {
  const topPanelNode = useMemo(
    () => createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } }),
    []
  );

  const mainPanelNode = useMemo(
    () => createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } }),
    []
  );

  const showFixedPanels = useIsWithinBreakpoints(['xs', 's']) || !chart || chart.hidden;
  const { euiTheme } = useEuiTheme();
  const defaultTopPanelHeight = euiTheme.base * 12;
  const minTopPanelHeight = euiTheme.base * 8;
  const minMainPanelHeight = euiTheme.base * 10;

  const chartClassName =
    showFixedPanels && !chart?.hidden
      ? css`
          height: ${defaultTopPanelHeight}px;
        `
      : 'eui-fullHeight';

  const panelsMode = chart
    ? showFixedPanels
      ? PANELS_MODE.FIXED
      : PANELS_MODE.RESIZABLE
    : PANELS_MODE.SINGLE;

  return (
    <>
      <InPortal node={topPanelNode}>
        <Chart
          className={chartClassName}
          services={services}
          hits={hits}
          chart={chart}
          appendHitsCounter={appendHitsCounter}
          appendHistogram={showFixedPanels ? <EuiSpacer size="s" /> : <EuiSpacer size="l" />}
          onEditVisualization={onEditVisualization}
          onResetChartHeight={
            topPanelHeight !== defaultTopPanelHeight && panelsMode === PANELS_MODE.RESIZABLE
              ? onResetChartHeight
              : undefined
          }
          onHideChartChange={onHideChartChange}
          onTimeIntervalChange={onTimeIntervalChange}
        />
      </InPortal>
      <InPortal node={mainPanelNode}>{children}</InPortal>
      <Panels
        className={className}
        mode={panelsMode}
        resizeRef={resizeRef}
        topPanelHeight={topPanelHeight ?? defaultTopPanelHeight}
        minTopPanelHeight={minTopPanelHeight}
        minMainPanelHeight={minMainPanelHeight}
        topPanel={<OutPortal node={topPanelNode} />}
        mainPanel={<OutPortal node={mainPanelNode} />}
        onTopPanelHeightChange={onTopPanelHeightChange}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default UnifiedHistogramLayout;
