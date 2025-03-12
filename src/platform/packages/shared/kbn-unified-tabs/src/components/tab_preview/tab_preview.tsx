/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiSplitPanel, EuiText, EuiCode } from '@elastic/eui';

interface TabPreviewProps {
  children: React.ReactNode;
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
}
export const TabPreview: React.FC<TabPreviewProps> = ({
  children,
  showPreview,
  setShowPreview,
}) => {
  return (
    <div
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
      css={css`
        position: relative;
      `}
    >
      {children}
      {showPreview && (
        <EuiSplitPanel.Outer grow css={getPreviewContainerCss()}>
          <EuiSplitPanel.Inner>
            <EuiText>
              <p>Preview</p>
            </EuiText>
          </EuiSplitPanel.Inner>
          <EuiSplitPanel.Inner grow={false} color="subdued">
            <EuiText>
              <EuiCode>Bottom panel</EuiCode>
            </EuiText>
          </EuiSplitPanel.Inner>
        </EuiSplitPanel.Outer>
      )}
    </div>
  );
};

function getPreviewContainerCss() {
  return css`
    position: fixed;
    z-index: 10000;
    width: 280px;
    min-height: 112px;
  `;
}
