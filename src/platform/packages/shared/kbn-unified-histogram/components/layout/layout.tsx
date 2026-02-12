/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiFullHeight, useEuiTheme, useIsWithinBreakpoints } from '@elastic/eui';
import type { PropsWithChildren, ReactNode } from 'react';
import React, { useState } from 'react';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import {
  ResizableLayout,
  ResizableLayoutDirection,
  ResizableLayoutMode,
} from '@kbn/resizable-layout';
import { css } from '@emotion/react';
import type {
  UnifiedHistogramChartContext,
  UnifiedHistogramHitsContext,
  UnifiedHistogramTopPanelHeightContext,
} from '../../types';

export type UnifiedHistogramLayoutProps = PropsWithChildren<{
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
  topPanelHeight?: UnifiedHistogramTopPanelHeightContext;

  /**
   * The default top panel height if `topPanelHeight` is not provided
   */
  defaultTopPanelHeight?: UnifiedHistogramTopPanelHeightContext;

  /**
   * Callback to update the topPanelHeight prop when a resize is triggered
   */
  onTopPanelHeightChange?: (topPanelHeight: UnifiedHistogramTopPanelHeightContext) => void;
}>;

export const UnifiedHistogramLayout = ({
  unifiedHistogramChart,
  chart,
  isChartAvailable,
  hits,
  topPanelHeight,
  defaultTopPanelHeight: originalDefaultTopPanelHeight,
  onTopPanelHeightChange,
  children,
}: UnifiedHistogramLayoutProps) => {
  const [mainPanelNode] = useState(() =>
    createHtmlPortalNode({
      attributes: { class: 'eui-fullHeight', 'data-test-subj': 'unifiedHistogramMainPanel' },
    })
  );

  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const showFixedPanels = isMobile || !chart || chart.hidden;
  const { euiTheme } = useEuiTheme();
  const minTopPanelHeight = euiTheme.base * 12;
  const defaultTopPanelHeight = originalDefaultTopPanelHeight ?? minTopPanelHeight;

  // When expanding chart (topPanelHeight is 'max-content'), allow the flex panel to shrink
  // to just the hits bar height so the chart can fill the remaining space.
  const isExpandChartMode = topPanelHeight === 'max-content' && (chart || hits);
  // Hits bar with toggle buttons is ~32-40px; keep minimum tight to avoid extra whitespace
  const minMainPanelHeight = isExpandChartMode ? euiTheme.base * 3 : euiTheme.base * 10;

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

  // When topPanelHeight is 'max-content', we must use Resizable mode so the layout
  // respects it (PanelsStatic ignores fixedPanelSize and would not expand the chart).
  const forceResizableForExpandChart =
    topPanelHeight === 'max-content' && (chart || hits);

  const panelsMode =
    chart || hits
      ? forceResizableForExpandChart || !showFixedPanels
        ? ResizableLayoutMode.Resizable
        : ResizableLayoutMode.Static
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
        fixedPanelSize={currentTopPanelHeight}
        minFixedPanelSize={minTopPanelHeight}
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
