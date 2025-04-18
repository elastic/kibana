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

export type UnifiedHistogramLayoutProps = PropsWithChildren<{
  /**
   * The parent container element, used to calculate the layout size
   */
  container: HTMLElement | null;
  chart: ReactNode;
  /**
   * Current top panel height -- leave undefined to use the default
   */
  topPanelHeight?: number;
  /**
   * Callback to update the topPanelHeight prop when a resize is triggered
   */
  onTopPanelHeightChange?: (topPanelHeight: number | undefined) => void;
}>;

export const UnifiedHistogramLayout2 = ({
  container,
  chart,
  topPanelHeight,
  onTopPanelHeightChange,
  children,
}: UnifiedHistogramLayoutProps) => {
  const [mainPanelNode] = useState(() =>
    createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } })
  );

  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const showChart = React.isValidElement(children);
  const showFixedPanels = isMobile || !showChart;
  const { euiTheme } = useEuiTheme();
  const defaultTopPanelHeight = euiTheme.base * 12;
  const minMainPanelHeight = euiTheme.base * 10;

  const chartCss =
    isMobile && showChart
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

  const panelsMode = showChart
    ? showFixedPanels
      ? ResizableLayoutMode.Static
      : ResizableLayoutMode.Resizable
    : ResizableLayoutMode.Single;

  const currentTopPanelHeight = topPanelHeight ?? defaultTopPanelHeight;

  return (
    <>
      <InPortal node={mainPanelNode}>
        {/* @ts-expect-error upgrade typescript v4.9.5 */}
        {showChart ? React.cloneElement(children, { isChartAvailable: true }) : children}
      </InPortal>
      <ResizableLayout
        mode={panelsMode}
        direction={ResizableLayoutDirection.Vertical}
        container={container}
        fixedPanelSize={currentTopPanelHeight}
        minFixedPanelSize={defaultTopPanelHeight}
        minFlexPanelSize={minMainPanelHeight}
        fixedPanel={chart}
        flexPanel={<OutPortal node={mainPanelNode} />}
        data-test-subj="unifiedHistogram"
        css={chartCss}
        onFixedPanelSizeChange={onTopPanelHeightChange}
      />
    </>
  );
};
