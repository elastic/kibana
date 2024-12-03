/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme, useIsWithinBreakpoints } from '@elastic/eui';
import {
  ResizableLayout,
  ResizableLayoutDirection,
  ResizableLayoutMode,
} from '@kbn/resizable-layout';
import React, { ReactNode, useState } from 'react';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import useObservable from 'react-use/lib/useObservable';
import { BehaviorSubject } from 'rxjs';
import { SidebarToggleState } from '../../../types';

export const SIDEBAR_WIDTH_KEY = 'discover:sidebarWidth';

export const DiscoverResizableLayout = ({
  container,
  sidebarToggleState$,
  sidebarPanel,
  mainPanel,
}: {
  container: HTMLElement | null;
  sidebarToggleState$: BehaviorSubject<SidebarToggleState>;
  sidebarPanel: ReactNode;
  mainPanel: ReactNode;
}) => {
  const [sidebarPanelNode] = useState(() =>
    createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } })
  );
  const [mainPanelNode] = useState(() =>
    createHtmlPortalNode({ attributes: { class: 'eui-fullHeight' } })
  );

  const { euiTheme } = useEuiTheme();
  const minSidebarWidth = euiTheme.base * 13;
  const defaultSidebarWidth = euiTheme.base * 19;
  const minMainPanelWidth = euiTheme.base * 24;

  const [sidebarWidth, setSidebarWidth] = useLocalStorage(SIDEBAR_WIDTH_KEY, defaultSidebarWidth);

  const sidebarToggleState = useObservable(sidebarToggleState$);
  const isSidebarCollapsed = sidebarToggleState?.isCollapsed ?? false;

  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const layoutMode =
    isMobile || isSidebarCollapsed ? ResizableLayoutMode.Static : ResizableLayoutMode.Resizable;
  const layoutDirection = isMobile
    ? ResizableLayoutDirection.Vertical
    : ResizableLayoutDirection.Horizontal;

  return (
    <>
      <InPortal node={sidebarPanelNode}>{sidebarPanel}</InPortal>
      <InPortal node={mainPanelNode}>{mainPanel}</InPortal>
      <ResizableLayout
        className="dscPageBody__contents"
        mode={layoutMode}
        direction={layoutDirection}
        container={container}
        fixedPanelSize={sidebarWidth ?? defaultSidebarWidth}
        minFixedPanelSize={minSidebarWidth}
        minFlexPanelSize={minMainPanelWidth}
        fixedPanel={<OutPortal node={sidebarPanelNode} />}
        flexPanel={<OutPortal node={mainPanelNode} />}
        data-test-subj="discoverLayout"
        onFixedPanelSizeChange={setSidebarWidth}
      />
    </>
  );
};
