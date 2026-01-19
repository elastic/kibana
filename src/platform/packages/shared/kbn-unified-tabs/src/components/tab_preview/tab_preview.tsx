/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { css } from '@emotion/react';
import useEvent from 'react-use/lib/useEvent';
import {
  EuiSplitPanel,
  EuiHealth,
  keys,
  useEuiTheme,
  EuiCodeBlock,
  EuiFlexItem,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiPortal,
  EuiText,
  type EuiThemeComputed,
} from '@elastic/eui';
import { isOfAggregateQueryType } from '@kbn/es-query';

import { PREVIEW_WIDTH } from '../../constants';
import type { TabPreviewData, TabItem } from '../../types';
import { TabStatus } from '../../types';

export interface TabPreviewProps {
  children: React.ReactNode;
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  tabItem: TabItem;
  previewData: TabPreviewData;
  stopPreviewOnHover?: boolean;
  previewDelay?: number;
  position?: 'bottom' | 'left';
}

const getQueryLanguage = (tabPreviewData: TabPreviewData) => {
  if (isOfAggregateQueryType(tabPreviewData.query)) {
    return 'esql';
  }

  return tabPreviewData.query.language;
};

const getPreviewQuery = (tabPreviewData: TabPreviewData) => {
  if (isOfAggregateQueryType(tabPreviewData.query)) {
    return tabPreviewData.query.esql;
  }

  return typeof tabPreviewData.query.query === 'string' ? tabPreviewData.query.query : '';
};

export const TabPreview: React.FC<TabPreviewProps> = ({
  children,
  showPreview,
  setShowPreview,
  tabItem,
  previewData,
  stopPreviewOnHover,
  position = 'bottom',
  previewDelay = 1250, // as "long" EuiToolTip delay
}) => {
  const { euiTheme } = useEuiTheme();
  const [previewTimer, setPreviewTimer] = useState<NodeJS.Timeout | null>(null);
  const tabRef = useRef<HTMLSpanElement>(null);
  const [tabPosition, setTabPosition] = useState({ top: 0, left: 0 });
  const [tabPreviewData, setTabPreviewData] = useState<TabPreviewData | null>(null);

  useEffect(() => {
    if (showPreview && tabRef.current) {
      const rect = tabRef.current.getBoundingClientRect();

      setTabPreviewData(previewData);

      if (position === 'left') {
        // Position to the left of the element
        let leftPosition = rect.left + window.scrollX - PREVIEW_WIDTH - euiTheme.base - 30; // extra 30 to push it off the EUI selectable menu
        const topPosition = rect.top + window.scrollY - euiTheme.base / 2;

        // Ensure preview doesn't go off left edge
        if (leftPosition < window.scrollX) {
          leftPosition = window.scrollX + euiTheme.base;
        }

        setTabPosition({
          top: topPosition,
          left: leftPosition,
        });
      } else {
        // Position below the element (default)
        let leftPosition = rect.left + window.scrollX;

        // Check if preview would extend beyond right edge
        const wouldExtendBeyondRight = rect.left + PREVIEW_WIDTH > window.innerWidth;

        if (wouldExtendBeyondRight) {
          // Align right edge of preview with right edge of window
          leftPosition = window.innerWidth - PREVIEW_WIDTH + window.scrollX;
        }

        setTabPosition({
          top: rect.bottom + window.scrollY + euiTheme.base / 2,
          left: leftPosition,
        });
      }
    }
  }, [showPreview, previewData, tabItem, euiTheme.base, position]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (showPreview && event.key === keys.ESCAPE) {
        setShowPreview(false);
      }
    },
    [setShowPreview, showPreview]
  );

  useEvent('keydown', onKeyDown);

  useEffect(() => {
    return () => {
      if (previewTimer) {
        clearTimeout(previewTimer);
      }
    };
  }, [previewTimer]);

  useEffect(() => {
    if (stopPreviewOnHover && previewTimer) {
      clearTimeout(previewTimer);
    }
  }, [previewTimer, stopPreviewOnHover]);

  const handleMouseEnter = useCallback(() => {
    if (stopPreviewOnHover) return;

    const timer = setTimeout(() => {
      setShowPreview(true);
    }, previewDelay);

    setPreviewTimer(timer);
  }, [previewDelay, setShowPreview, stopPreviewOnHover]);

  const handleMouseLeave = useCallback(() => {
    if (previewTimer) {
      clearTimeout(previewTimer);
      setPreviewTimer(null);
    }

    setShowPreview(false);
  }, [previewTimer, setShowPreview]);

  return (
    <div onMouseLeave={handleMouseLeave}>
      <span onMouseEnter={handleMouseEnter} ref={tabRef}>
        {children}
      </span>
      <EuiPortal>
        <EuiSplitPanel.Outer
          grow
          css={getPreviewContainerCss(euiTheme, showPreview, tabPosition)}
          data-test-subj={`unifiedTabs_tabPreview_outerPanel_${tabItem.id}`}
        >
          {showPreview && !!tabPreviewData && (
            <TabPreviewInner tabItem={tabItem} tabPreviewData={tabPreviewData} />
          )}
        </EuiSplitPanel.Outer>
      </EuiPortal>
    </div>
  );
};

const TabPreviewInner: React.FC<{
  tabItem: TabPreviewProps['tabItem'];
  tabPreviewData: TabPreviewData;
}> = ({ tabItem, tabPreviewData }) => {
  const { euiTheme } = useEuiTheme();
  const previewQuery = getPreviewQuery(tabPreviewData);

  return (
    <>
      <EuiSplitPanel.Inner
        paddingSize="none"
        css={getSplitPanelCss(euiTheme)}
        data-test-subj="unifiedTabs_tabPreview_contentPanel"
      >
        {tabPreviewData.title ? (
          <EuiText
            size="xs"
            className="eui-textBreakWord"
            css={getPreviewTitleCss(euiTheme, Boolean(previewQuery))}
            data-test-subj={`unifiedTabs_tabPreview_title_${tabItem.id}`}
          >
            {tabPreviewData.title}
          </EuiText>
        ) : null}
        {previewQuery ? (
          <EuiCodeBlock
            language={getQueryLanguage(tabPreviewData)}
            transparentBackground
            paddingSize="none"
            css={codeBlockCss}
            data-test-subj={`unifiedTabs_tabPreviewCodeBlock_${tabItem.id}`}
          >
            {previewQuery}
          </EuiCodeBlock>
        ) : null}
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner
        grow={false}
        color="subdued"
        paddingSize="none"
        className="eui-textBreakWord"
        css={getSplitPanelCss(euiTheme)}
        data-test-subj={`unifiedTabs_tabPreview_label_${tabItem.id}`}
      >
        {tabPreviewData.status === TabStatus.RUNNING ? (
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">{tabItem.label}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiHealth color={tabPreviewData.status} textSize="s">
            {tabItem.label}
          </EuiHealth>
        )}
      </EuiSplitPanel.Inner>
    </>
  );
};

const getPreviewContainerCss = (
  euiTheme: EuiThemeComputed,
  showPreview: boolean,
  tabPosition: { top: number; left: number }
) => {
  return css`
    position: absolute;
    top: ${tabPosition.top}px;
    left: ${tabPosition.left}px;
    z-index: 10000;
    margin-top: ${euiTheme.size.xs};
    width: ${PREVIEW_WIDTH}px;
    opacity: ${showPreview ? 1 : 0};
    transition: opacity ${euiTheme.animation.normal} ease;
  `;
};

const getPreviewTitleCss = (euiTheme: EuiThemeComputed, hasQuery: boolean) => {
  return css`
    margin-bottom: ${hasQuery ? euiTheme.size.s : 0};
    font-family: ${euiTheme.font.familyCode};
  `;
};

const codeBlockCss = css`
  .euiCodeBlock__code {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    overflow: hidden;
  }
`;

const getSplitPanelCss = (euiTheme: EuiThemeComputed) => {
  return css`
    padding-inline: ${euiTheme.size.base};
    padding-block: ${euiTheme.size.s};
  `;
};
