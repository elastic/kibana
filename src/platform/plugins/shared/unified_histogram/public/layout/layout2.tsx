/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme, useIsWithinBreakpoints } from '@elastic/eui';
import React, { PropsWithChildren, ReactNode, useState } from 'react';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import {
  ResizableLayout,
  ResizableLayoutDirection,
  ResizableLayoutMode,
} from '@kbn/resizable-layout';

export type UnifiedHistogramLayoutProps = PropsWithChildren<{
  /**
   * Optional class name to add to the layout container
   */
  className?: string;
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
  className,
  container,
  chart,
  topPanelHeight,
  onTopPanelHeightChange,
  children,
}: UnifiedHistogramLayoutProps) => {
  const [topPanelNode] = useState(() =>
    createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } })
  );
  const [mainPanelNode] = useState(() =>
    createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } })
  );

  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const showChart = React.isValidElement(children);
  const showFixedPanels = isMobile || !showChart;
  const { euiTheme } = useEuiTheme();
  const defaultTopPanelHeight = euiTheme.base * 12;
  const minMainPanelHeight = euiTheme.base * 10;

  const panelsMode = showChart
    ? showFixedPanels
      ? ResizableLayoutMode.Static
      : ResizableLayoutMode.Resizable
    : ResizableLayoutMode.Single;

  const currentTopPanelHeight = topPanelHeight ?? defaultTopPanelHeight;

  return (
    <>
      <InPortal node={topPanelNode}>{chart}</InPortal>
      <InPortal node={mainPanelNode}>
        {/* @ts-expect-error upgrade typescript v4.9.5 */}
        {showChart ? React.cloneElement(children, { isChartAvailable: true }) : children}
      </InPortal>
      <ResizableLayout
        className={className}
        mode={panelsMode}
        direction={ResizableLayoutDirection.Vertical}
        container={container}
        fixedPanelSize={currentTopPanelHeight}
        minFixedPanelSize={defaultTopPanelHeight}
        minFlexPanelSize={minMainPanelHeight}
        fixedPanel={<OutPortal node={topPanelNode} />}
        flexPanel={<OutPortal node={mainPanelNode} />}
        data-test-subj="unifiedHistogram"
        onFixedPanelSizeChange={onTopPanelHeightChange}
      />
    </>
  );
};
