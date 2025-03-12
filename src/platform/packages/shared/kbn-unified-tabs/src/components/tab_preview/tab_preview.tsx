/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import {
  EuiSplitPanel,
  EuiText,
  EuiCode,
  keys,
  useEuiTheme,
  type EuiThemeComputed,
} from '@elastic/eui';

interface TabPreviewProps {
  children: React.ReactNode;
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  stopPreviewOnHover?: boolean;
}

export const TabPreview: React.FC<TabPreviewProps> = ({
  children,
  showPreview,
  setShowPreview,
  stopPreviewOnHover,
}) => {
  const { euiTheme } = useEuiTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === keys.ESCAPE) {
        setShowPreview(false);
      }
    },
    [setShowPreview]
  );

  // enabling closing the preview with the ESC key without altering the current focus
  useEffect(() => {
    if (showPreview) {
      document.addEventListener('keydown', onKeyDown);
    } else {
      document.removeEventListener('keydown', onKeyDown);
    }
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showPreview, onKeyDown]);

  return (
    <div ref={containerRef}>
      <span
        onMouseEnter={() => !stopPreviewOnHover && setShowPreview(true)}
        onMouseLeave={() => setShowPreview(false)}
      >
        {children}
      </span>
      {showPreview && (
        <EuiSplitPanel.Outer grow css={getPreviewContainerCss(euiTheme)}>
          <EuiSplitPanel.Inner>
            <EuiText>
              <p>Tab preview</p>
            </EuiText>
          </EuiSplitPanel.Inner>
          <EuiSplitPanel.Inner grow={false} color="subdued">
            <EuiText>
              <EuiCode>Preview bottom panel</EuiCode>
            </EuiText>
          </EuiSplitPanel.Inner>
        </EuiSplitPanel.Outer>
      )}
    </div>
  );
};

const getPreviewContainerCss = (euiTheme: EuiThemeComputed) => {
  return css`
    position: fixed;
    z-index: 10000;
    margin-top: ${euiTheme.size.xs};
    width: 280px;
    min-height: 112px;
  `;
};
