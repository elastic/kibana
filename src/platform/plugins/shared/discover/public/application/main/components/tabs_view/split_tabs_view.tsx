/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import {
  ResizableLayout,
  ResizableLayoutDirection,
  ResizableLayoutMode,
} from '@kbn/resizable-layout';
import { SingleTabView, type SingleTabViewProps } from '../single_tab_view';
import { useChartPortalNode } from '../chart';
import {
  CurrentTabProvider,
  internalStateActions,
  selectAllTabs,
  useInternalStateDispatch,
  useInternalStateSelector,
} from '../../state_management/redux';

const containerStyles = css`
  height: 100%;
  width: 100%;
`;

interface SplitTabPaneProps extends SingleTabViewProps {
  tabId: string;
  /** Which side of the split the pane is on, used to add the gutter on the inner side only */
  side: 'start' | 'end';
}

const SplitTabPane = ({ tabId, side, ...singleTabViewProps }: SplitTabPaneProps) => {
  const { euiTheme } = useEuiTheme();
  const dispatch = useInternalStateDispatch();
  const allTabs = useInternalStateSelector(selectAllTabs);
  const isFocused = useInternalStateSelector((state) => state.tabs.unsafeCurrentId === tabId);
  const chartPortalNode = useChartPortalNode(tabId);

  // The focused pane owns the global state (URL, time range, search session),
  // so interacting with a pane makes it the selected tab
  const focusPane = useCallback(() => {
    const tab = allTabs.find(({ id }) => id === tabId);

    if (isFocused || !tab) {
      return;
    }

    dispatch(internalStateActions.updateTabs({ items: allTabs, selectedItem: tab }));
  }, [allTabs, dispatch, isFocused, tabId]);

  return (
    <div
      css={css`
        height: 100%;
        width: 100%;
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
        ${side === 'start' ? 'padding-inline-end' : 'padding-inline-start'}: ${euiTheme.size.s};
      `}
    >
      <div
        data-test-subj={`discoverSplitPane-${tabId}`}
        data-focused={isFocused}
        onMouseDownCapture={focusPane}
        onFocusCapture={focusPane}
        css={css`
          height: 100%;
          width: 100%;
          background-color: ${euiTheme.colors.backgroundBasePlain};
          box-shadow: inset 0 ${isFocused ? euiTheme.border.width.thick : 0} 0
            ${euiTheme.colors.primary};
        `}
      >
        <CurrentTabProvider currentTabId={tabId} currentChartPortalNode={chartPortalNode}>
          <SingleTabView {...singleTabViewProps} />
        </CurrentTabProvider>
      </div>
    </div>
  );
};

export const SplitTabsView = ({
  tabIds,
  ...singleTabViewProps
}: SingleTabViewProps & { tabIds: string[] }) => {
  const { euiTheme } = useEuiTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [firstPaneWidth, setFirstPaneWidth] = useState<number | undefined>();
  const [firstTabId, secondTabId] = tabIds;
  const minPaneWidth = euiTheme.base * 24;

  // Start with both panes at the same width
  useLayoutEffect(() => {
    const containerWidth = containerRef.current?.getBoundingClientRect().width;
    setFirstPaneWidth((currentWidth) => currentWidth ?? Math.floor((containerWidth ?? 0) / 2));
  }, []);

  return (
    <div ref={containerRef} data-test-subj="discoverSplitView" css={containerStyles}>
      {firstPaneWidth ? (
        <ResizableLayout
          mode={ResizableLayoutMode.Resizable}
          direction={ResizableLayoutDirection.Horizontal}
          fixedPanelSize={firstPaneWidth}
          minFixedPanelSize={minPaneWidth}
          minFlexPanelSize={minPaneWidth}
          fixedPanel={<SplitTabPane tabId={firstTabId} side="start" {...singleTabViewProps} />}
          flexPanel={<SplitTabPane tabId={secondTabId} side="end" {...singleTabViewProps} />}
          data-test-subj="discoverSplitViewLayout"
          onFixedPanelSizeChange={setFirstPaneWidth}
        />
      ) : null}
    </div>
  );
};
