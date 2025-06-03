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
  previewDelay = 500,
}) => {
  const { euiTheme } = useEuiTheme();
  const [previewTimer, setPreviewTimer] = useState<NodeJS.Timeout | null>(null);
  const tabRef = useRef<HTMLSpanElement>(null);
  const [tabPosition, setTabPosition] = useState({ top: 0, left: 0 });
  const [tabPreviewData, setTabPreviewData] = useState<TabPreviewData | null>(null);

  useEffect(() => {
    if (showPreview && tabRef.current) {
      const rect = tabRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;

      // Check if preview would extend beyond right edge
      const wouldExtendBeyondRight = rect.left + PREVIEW_WIDTH > windowWidth;

      // Calculate left position based on screen edge constraints
      let leftPosition = rect.left + window.scrollX;

      if (wouldExtendBeyondRight) {
        // Align right edge of preview with right edge of window
        leftPosition = windowWidth - PREVIEW_WIDTH + window.scrollX;
      }

      setTabPreviewData(previewData);

      setTabPosition({
        top: rect.bottom + window.scrollY,
        left: leftPosition,
      });
    }
  }, [showPreview, previewData, tabItem]);

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
    <div>
      <span onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} ref={tabRef}>
        {children}
      </span>
      <EuiPortal>
        <EuiSplitPanel.Outer
          grow
          css={getPreviewContainerCss(euiTheme, showPreview, tabPosition)}
          data-test-subj={`unifiedTabs_tabPreview_${tabItem.id}`}
        >
          {showPreview && !!tabPreviewData && (
            <>
              <EuiSplitPanel.Inner paddingSize="none" css={getSplitPanelCss(euiTheme)}>
                <EuiCodeBlock
                  language={getQueryLanguage(tabPreviewData)}
                  transparentBackground
                  paddingSize="none"
                >
                  {getPreviewQuery(tabPreviewData)}
                </EuiCodeBlock>
              </EuiSplitPanel.Inner>
              <EuiSplitPanel.Inner
                grow={false}
                color="subdued"
                paddingSize="none"
                css={getSplitPanelCss(euiTheme)}
              >
                {tabPreviewData.status === TabStatus.RUNNING ? (
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiLoadingSpinner />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText>{tabItem.label}</EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ) : (
                  <EuiHealth color={tabPreviewData.status} textSize="m">
                    {tabItem.label}
                  </EuiHealth>
                )}
              </EuiSplitPanel.Inner>
            </>
          )}
        </EuiSplitPanel.Outer>
      </EuiPortal>
    </div>
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

const getSplitPanelCss = (euiTheme: EuiThemeComputed) => {
  return css`
    padding-inline: ${euiTheme.size.base};
    padding-block: ${euiTheme.size.s};
  `;
};
