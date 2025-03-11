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
import type { TabItem } from '../../types';

interface TabPreviewProps {
  position: { top: number; left: number };
  item: TabItem;
}

export const TabPreview: React.FC<TabPreviewProps> = ({ item, position }) => {
  return (
    <EuiSplitPanel.Outer grow css={getPreviewContainerCss(position)}>
      <EuiSplitPanel.Inner>
        <EuiText>
          <p>Preview of {item.label}</p>
        </EuiText>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner grow={false} color="subdued">
        <EuiText>
          <EuiCode>Bottom panel</EuiCode>
        </EuiText>
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};

function getPreviewContainerCss(position: { top: number; left: number }) {
  return css`
    position: fixed;
    z-index: 1000;
    top: ${position.top}px;
    left: ${position.left}px;
  `;
}
