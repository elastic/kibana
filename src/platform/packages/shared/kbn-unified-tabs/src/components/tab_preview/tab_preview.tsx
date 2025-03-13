/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiSplitPanel,
  EuiHealth,
  keys,
  useEuiTheme,
  EuiCodeBlock,
  EuiFlexItem,
  EuiFlexGroup,
  EuiLoadingSpinner,
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

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === keys.ESCAPE) {
        setShowPreview(false);
      }
    },
    [setShowPreview]
  );

  // enables closing the preview with the ESC key without altering the current focus
  useEffect(() => {
    if (showPreview) {
      document.addEventListener('keydown', onKeyDown);
    } else {
      document.removeEventListener('keydown', onKeyDown);
    }
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showPreview, onKeyDown]);

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
      <span onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        {children}
      </span>
      <EuiSplitPanel.Outer grow css={getPreviewContainerCss(euiTheme, showPreview)}>
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
    </div>
  );
};

const getPreviewContainerCss = (euiTheme: EuiThemeComputed, showPreview: boolean) => {
  return css`
    position: fixed;
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
