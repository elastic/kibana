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
  UnifiedHistogramContext,
  UnifiedHistogramServices,
  UnifiedHistogramStatus,
} from '../types';

export interface UnifiedHistogramLayoutProps extends PropsWithChildren<unknown> {
  className?: string;
  services: UnifiedHistogramServices;
  status: UnifiedHistogramStatus;
  hits: number;
  histogram?: UnifiedHistogramContext;
  resizeRef: RefObject<HTMLDivElement>;
  topPanelHeight?: number;
  appendHitsCounter?: ReactElement;
  onTopPanelHeightChange?: (height: number) => void;
  onEditVisualization?: () => void;
  onResetChartHeight?: () => void;
  onHideChartChange?: (hideChart: boolean) => void;
  onIntervalChange?: (interval: string) => void;
}

export const UnifiedHistogramLayout = ({
  className,
  services,
  status,
  hits,
  histogram,
  resizeRef,
  topPanelHeight,
  appendHitsCounter,
  onTopPanelHeightChange,
  onEditVisualization,
  onResetChartHeight,
  onHideChartChange,
  onIntervalChange,
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

  const showFixedPanels = useIsWithinBreakpoints(['xs', 's']) || !histogram || histogram.hidden;
  const { euiTheme } = useEuiTheme();
  const defaultTopPanelHeight = euiTheme.base * 12;
  const minTopPanelHeight = euiTheme.base * 8;
  const minMainPanelHeight = euiTheme.base * 10;

  const chartClassName =
    showFixedPanels && !histogram?.hidden
      ? css`
          height: ${defaultTopPanelHeight}px;
        `
      : 'eui-fullHeight';

  const panelsMode = histogram
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
          status={status}
          hits={hits}
          histogram={histogram}
          appendHitsCounter={appendHitsCounter}
          appendHistogram={showFixedPanels ? <EuiSpacer size="s" /> : <EuiSpacer size="m" />}
          onEditVisualization={onEditVisualization}
          onResetChartHeight={panelsMode === PANELS_MODE.RESIZABLE ? onResetChartHeight : undefined}
          onHideChartChange={onHideChartChange}
          onIntervalChange={onIntervalChange}
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
