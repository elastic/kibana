/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactElement, RefObject, useMemo } from 'react';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import { Panels, PANELS_MODE } from '../panels';

export interface UnifiedHistogramLayoutProps {
  className?: string;
  mode: PANELS_MODE;
  resizeRef: RefObject<HTMLDivElement>;
  topPanelHeight: number;
  minTopPanelHeight: number;
  minMainPanelHeight: number;
  topPanel: ReactElement;
  mainPanel: ReactElement;
  onTopPanelHeightChange: (height: number) => void;
}

export const UnifiedHistogramLayout = ({
  className,
  mode,
  resizeRef,
  topPanelHeight,
  minTopPanelHeight,
  minMainPanelHeight,
  topPanel,
  mainPanel,
  onTopPanelHeightChange,
}: UnifiedHistogramLayoutProps) => {
  const topPanelNode = useMemo(
    () => createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } }),
    []
  );

  const mainPanelNode = useMemo(
    () => createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } }),
    []
  );

  return (
    <>
      <InPortal node={topPanelNode}>{topPanel}</InPortal>
      <InPortal node={mainPanelNode}>{mainPanel}</InPortal>
      <Panels
        className={className}
        mode={mode}
        resizeRef={resizeRef}
        topPanelHeight={topPanelHeight}
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
