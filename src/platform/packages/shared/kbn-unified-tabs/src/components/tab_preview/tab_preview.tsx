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
  type EuiThemeComputed,
  EuiText,
} from '@elastic/eui';

// TODO adjust interface when real data is available, this currently types TAB_CONTENT_MOCK
export interface PreviewContent {
  id: number;
  name: string;
  query: {
    language: 'esql' | 'kql';
    query: string;
  };
  status: 'success' | 'running' | 'danger'; // status for now matches EuiHealth colors for mocking simplicity
}
interface TabPreviewProps {
  children: React.ReactNode;
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  previewContent: PreviewContent;
  stopPreviewOnHover?: boolean;
  previewDelay?: number;
}

export const TabPreview: React.FC<TabPreviewProps> = ({
  children,
  showPreview,
  setShowPreview,
  previewContent,
  stopPreviewOnHover,
  previewDelay = 500,
}) => {
  const { euiTheme } = useEuiTheme();
  const [previewTimer, setPreviewTimer] = useState<NodeJS.Timeout | null>(null);
  const tabRef = useRef<HTMLSpanElement>(null);
  const [tabPosition, setTabPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (showPreview && tabRef.current) {
      const rect = tabRef.current.getBoundingClientRect();
      setTabPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
  }, [showPreview]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === keys.ESCAPE) {
        setShowPreview(false);
      }
    },
    [setShowPreview]
  );

  useEvent('keydown', onKeyDown);

  useEffect(() => {
    return () => {
      if (previewTimer) {
        clearTimeout(previewTimer);
      }
    };
  }, [previewTimer]);

  const handleMouseEnter = () => {
    if (stopPreviewOnHover) return;

    const timer = setTimeout(() => {
      setShowPreview(true);
    }, previewDelay);

    setPreviewTimer(timer);
  };

  const handleMouseLeave = () => {
    if (previewTimer) {
      clearTimeout(previewTimer);
      setPreviewTimer(null);
    }

    setShowPreview(false);
  };

  return (
    <div>
      <span onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} ref={tabRef}>
        {children}
      </span>
      <EuiPortal>
        <EuiSplitPanel.Outer grow css={getPreviewContainerCss(euiTheme, showPreview, tabPosition)}>
          <EuiSplitPanel.Inner paddingSize="none" css={getSplitPanelCss(euiTheme)}>
            <EuiCodeBlock
              language={previewContent.query.language}
              transparentBackground
              paddingSize="none"
            >
              {previewContent.query.query}
            </EuiCodeBlock>
          </EuiSplitPanel.Inner>
          <EuiSplitPanel.Inner
            grow={false}
            color="subdued"
            paddingSize="none"
            css={getSplitPanelCss(euiTheme)}
          >
            {previewContent.status === 'running' ? (
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText>{previewContent.name}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <EuiHealth color={previewContent.status} textSize="m">
                {previewContent.name}
              </EuiHealth>
            )}
          </EuiSplitPanel.Inner>
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
    width: 280px;
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
