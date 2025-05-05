/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiFullHeight, useEuiTheme, useIsWithinBreakpoints } from '@elastic/eui';
import React, { PropsWithChildren, ReactNode, useState } from 'react';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import {
  ResizableLayout,
  ResizableLayoutDirection,
  ResizableLayoutMode,
} from '@kbn/resizable-layout';
import { css } from '@emotion/react';
import { UnifiedHistogramChartContext, UnifiedHistogramHitsContext } from '../../types';

export type UnifiedHistogramLayoutProps = PropsWithChildren<{
  /**
   * The parent container element, used to calculate the layout size
   */
  container: HTMLElement | null;
  /**
   * The rendered UnifiedHistogramChart component
   */
  unifiedHistogramChart: ReactNode;
  /**
   * Context object for the chart -- leave undefined to hide the chart
   */
  chart?: UnifiedHistogramChartContext;
  /**
   * Flag to indicate if the chart is available for rendering
   */
  isChartAvailable?: boolean;
  /**
   * Context object for the hits count -- leave undefined to hide the hits count
   */
  hits?: UnifiedHistogramHitsContext;
  /**
   * Current top panel height -- leave undefined to use the default
   */
  topPanelHeight?: number;
  /**
   * Callback to update the topPanelHeight prop when a resize is triggered
   */
  onTopPanelHeightChange?: (topPanelHeight: number | undefined) => void;
}>;

export const UnifiedHistogramLayout = ({
  container,
  unifiedHistogramChart,
  chart,
  isChartAvailable,
  hits,
  topPanelHeight,
  onTopPanelHeightChange,
  children,
}: UnifiedHistogramLayoutProps) => {
  const [mainPanelNode] = useState(() =>
    createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } })
  );

  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const showFixedPanels = isMobile || !chart || chart.hidden;
  const { euiTheme } = useEuiTheme();
  const defaultTopPanelHeight = euiTheme.base * 12;
  const minMainPanelHeight = euiTheme.base * 10;

  const chartCss =
    isMobile && chart && !chart.hidden
      ? css`
          .unifiedHistogram__chart {
            height: ${defaultTopPanelHeight}px;
          }
        `
      : css`
          .unifiedHistogram__chart {
            ${euiFullHeight()}
          }
        `;

  const panelsMode =
    chart || hits
      ? showFixedPanels
        ? ResizableLayoutMode.Static
        : ResizableLayoutMode.Resizable
      : ResizableLayoutMode.Single;

  const currentTopPanelHeight = topPanelHeight ?? defaultTopPanelHeight;

  return (
    <>
      <InPortal node={mainPanelNode}>
        {React.isValidElement<{ isChartAvailable?: boolean }>(children)
          ? React.cloneElement(children, { isChartAvailable })
          : children}
      </InPortal>
      <ResizableLayout
        mode={panelsMode}
        direction={ResizableLayoutDirection.Vertical}
        container={container}
        fixedPanelSize={currentTopPanelHeight}
        minFixedPanelSize={defaultTopPanelHeight}
        minFlexPanelSize={minMainPanelHeight}
        fixedPanel={unifiedHistogramChart}
        flexPanel={<OutPortal node={mainPanelNode} />}
        data-test-subj="unifiedHistogram"
        css={chartCss}
        onFixedPanelSizeChange={onTopPanelHeightChange}
      />
    </>
  );
};
