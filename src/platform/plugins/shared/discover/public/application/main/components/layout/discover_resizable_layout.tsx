/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme, useIsWithinBreakpoints, type UseEuiTheme } from '@elastic/eui';
import {
  ResizableLayout,
  ResizableLayoutDirection,
  ResizableLayoutMode,
} from '@kbn/resizable-layout';
import React, { useState, type ReactNode, useCallback, type ComponentProps } from 'react';
import { css } from '@emotion/react';
import { createHtmlPortalNode, InPortal, OutPortal } from 'react-reverse-portal';
import useObservable from 'react-use/lib/useObservable';
import type { BehaviorSubject } from 'rxjs';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { SidebarToggleState } from '../../../types';
import { withRestorableState, useRestorableState } from './discover_layout_restorable_state';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

export const SIDEBAR_WIDTH_KEY = 'discover:sidebarWidth';

export const InternalDiscoverResizableLayout = ({
  sidebarToggleState$,
  isSidebarHidden,
  sidebarPanel,
  mainPanel,
}: {
  sidebarToggleState$: BehaviorSubject<SidebarToggleState>;
  isSidebarHidden?: boolean;
  sidebarPanel: ReactNode;
  mainPanel: ReactNode;
}) => {
  const { storage } = useDiscoverServices();
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
  const layoutCss = useMemoCss(dscPageBodyContentsStyles);

  const [sidebarWidth, setSidebarWidth] = useRestorableState(
    'sidebarWidth',
    () => {
      const widthInLocalStorage = Number(storage?.get(SIDEBAR_WIDTH_KEY));
      return widthInLocalStorage || defaultSidebarWidth;
    },
    {
      shouldStoreDefaultValueRightAway: true, // otherwise, it would re-initialize with the localStorage value which might get updated in the meantime
    }
  );

  const setSidebarWidthAndUpdateInStorage = useCallback(
    (width: number) => {
      setSidebarWidth(width);
      storage.set(SIDEBAR_WIDTH_KEY, width);
    },
    [setSidebarWidth, storage]
  );

  const sidebarToggleState = useObservable(sidebarToggleState$);
  const isSidebarCollapsed = sidebarToggleState?.isCollapsed ?? false;

  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const layoutMode = isSidebarHidden
    ? ResizableLayoutMode.Single
    : isMobile || isSidebarCollapsed
    ? ResizableLayoutMode.Static
    : ResizableLayoutMode.Resizable;
  const layoutDirection = isMobile
    ? ResizableLayoutDirection.Vertical
    : ResizableLayoutDirection.Horizontal;

  return (
    <>
      <InPortal node={sidebarPanelNode}>{sidebarPanel}</InPortal>
      <InPortal node={mainPanelNode}>{mainPanel}</InPortal>
      <ResizableLayout
        className="dscPageBody__contents" // class is used in other styles
        css={layoutCss.contents}
        mode={layoutMode}
        direction={layoutDirection}
        fixedPanelSize={sidebarWidth ?? defaultSidebarWidth}
        minFixedPanelSize={minSidebarWidth}
        minFlexPanelSize={minMainPanelWidth}
        fixedPanel={<OutPortal node={sidebarPanelNode} />}
        flexPanel={<OutPortal node={mainPanelNode} />}
        data-test-subj="discoverLayout"
        onFixedPanelSizeChange={setSidebarWidthAndUpdateInStorage}
      />
    </>
  );
};

export const DiscoverResizableLayout = withRestorableState(InternalDiscoverResizableLayout);

export type DiscoverResizableLayoutProps = ComponentProps<typeof DiscoverResizableLayout>;

const panelCardCss = (euiTheme: UseEuiTheme['euiTheme']) => css`
  background-color: ${euiTheme.colors.backgroundBasePlain};
  /* POC: bigger radius + border so panels read as cards on recessed */
  border-radius: ${euiTheme.border.radius.frame};
  border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
  overflow: hidden;
`;

const transparentPanelCss = css`
  background-color: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
`;

const dscPageBodyContentsStyles = {
  contents: ({ euiTheme }: UseEuiTheme) => css`
    overflow: hidden;
    height: 100%;

    /*
     * POC: gutter = pageBody padding (size.s).
     * Static EuiFlexGroup (no handle): gap only.
     * Resizable: handle size only — default handle is size.base and looked wider than top.
     * Note: direction variants are Emotion labels, not real classes — target buttons directly.
     */
    &.euiFlexGroup {
      gap: ${euiTheme.size.s};
    }

    &.euiResizableContainer {
      gap: 0;
    }

    /* PanelsResizable sets data-test-subj to id+ResizableContainer, not the bare id */
    [data-test-subj='unifiedHistogramResizableContainer'] {
      gap: 0;
    }

    .euiResizableButton {
      /* POC: cancel EUI overlap so recessed gutter shows; keep hit target */
      margin-inline: 0 !important; /* stylelint-disable-line declaration-no-important */
      margin-block: 0 !important; /* stylelint-disable-line declaration-no-important */

      &::before,
      &::after {
        background-color: transparent !important; /* stylelint-disable-line declaration-no-important */
      }

      &:hover,
      &:focus,
      &:active {
        background-color: transparent;
      }
    }

    /* POC: sidebar ↔ main gutter = size.s (matches top padding) */
    > .euiResizableButton,
    [data-test-subj='discoverLayoutResizableButton'] {
      inline-size: ${euiTheme.size.s} !important; /* stylelint-disable-line declaration-no-important */
      width: ${euiTheme.size.s} !important; /* stylelint-disable-line declaration-no-important */
    }

    /*
     * POC: chart to documents gutter = size.s (same as sidebar gutter).
     * Target unifiedHistogramResizableButton — nested unifiedHistogram selector never matched
     * (actual attr is unifiedHistogramResizableContainer), so the handle stayed at size.base (16).
     */
    [data-test-subj='unifiedHistogramResizableButton'] {
      height: ${euiTheme.size.s} !important; /* stylelint-disable-line declaration-no-important */
      block-size: ${euiTheme.size.s} !important; /* stylelint-disable-line declaration-no-important */
    }

    /*
     * POC: data-test-subj is on the inner .euiResizablePanel__content (EuiPanel), not the wrapper.
     * Sidebar card — field list only.
     */
    > .euiResizablePanel[data-position='first'],
    > .euiFlexItem:first-child:not(:only-child) {
      overflow: hidden;
      border-radius: ${euiTheme.border.radius.frame};
    }

    [data-test-subj='discoverLayoutResizablePanelFixed'],
    > .euiFlexItem:first-child:not(:only-child) {
      ${panelCardCss(euiTheme)}
    }

    /* POC: main wrapper stays transparent so chart + documents / empty state own their cards */
    > .euiResizablePanel[data-position='last'],
    > .euiFlexItem:last-child {
      ${transparentPanelCss};
      overflow: hidden;
    }

    [data-test-subj='discoverLayoutResizablePanelFlex'] {
      ${transparentPanelCss};
    }

    /* POC: chart + documents each get their own card (not one outer wrapper) */
    [data-test-subj='unifiedHistogramResizablePanelFixed'],
    [data-test-subj='unifiedHistogramResizablePanelFlex'] {
      ${panelCardCss(euiTheme)}
    }

    /* POC: documents-only / static histogram cards — nested only, not the outer sidebar layout */
    > .euiResizablePanel [data-test-subj='resizableLayoutSingleContainer'] > .euiFlexItem,
    > .euiResizablePanel
      [data-test-subj='resizableLayoutStaticContainer']
      > .euiFlexItem:not(:has([data-test-subj='unifiedHistogramChartPanelHidden'])),
    > .euiFlexItem:last-child [data-test-subj='resizableLayoutSingleContainer'] > .euiFlexItem,
    > .euiFlexItem:last-child
      [data-test-subj='resizableLayoutStaticContainer']
      > .euiFlexItem:not(:has([data-test-subj='unifiedHistogramChartPanelHidden'])) {
      ${panelCardCss(euiTheme)}
    }

    /*
     * POC: when the chart is hidden/unavailable, UnifiedHistogram still mounts an empty
     * placeholder in a Static fixed slot — our card border turned that into a 2px line.
     */
    [data-test-subj='resizableLayoutStaticContainer']
      > .euiFlexItem:has([data-test-subj='unifiedHistogramChartPanelHidden']) {
      display: none;
    }
  `,
};
