/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

export const DiscoverFixedPanels = ({
  className,
  histogramHeight,
  isPlainRecord,
  hideChart,
  histogramPanel,
  mainPanel,
}: {
  className?: string;
  histogramHeight: number;
  isPlainRecord: boolean;
  hideChart: boolean | undefined;
  histogramPanel: React.ReactElement;
  mainPanel: React.ReactElement;
}) => {
  const histogramPanelCss = hideChart
    ? undefined
    : css`
        height: ${histogramHeight}px;
      `;

  const mainPanelCss = css`
    min-height: 0;
  `;

  return (
    <EuiFlexGroup
      className={className}
      direction="column"
      alignItems="stretch"
      gutterSize="none"
      responsive={false}
    >
      {!isPlainRecord && (
        <EuiFlexItem grow={false} css={histogramPanelCss}>
          {histogramPanel}
        </EuiFlexItem>
      )}
      <EuiFlexItem css={mainPanelCss}>{mainPanel}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
