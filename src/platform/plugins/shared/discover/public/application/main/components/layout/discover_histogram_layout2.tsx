/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { UnifiedHistogramLayout2 } from '@kbn/unified-histogram-plugin/public';
import { css } from '@emotion/react';
import { OutPortal } from 'react-reverse-portal';
import { type DiscoverMainContentProps, DiscoverMainContent } from './discover_main_content';
import { useCurrentTabChartPortalNode } from '../../state_management/redux';

export interface DiscoverHistogramLayoutProps2 extends DiscoverMainContentProps {
  container: HTMLElement | null;
}

const histogramLayoutCss = css`
  height: 100%;
`;

export const DiscoverHistogramLayout2 = ({
  container,
  panelsToggle,
  ...mainContentProps
}: DiscoverHistogramLayoutProps2) => {
  const chartPortalNode = useCurrentTabChartPortalNode();

  return (
    <UnifiedHistogramLayout2
      container={container}
      chart={
        chartPortalNode ? (
          <OutPortal node={chartPortalNode} isSelected={true} panelsToggle={panelsToggle} />
        ) : null
      }
      css={histogramLayoutCss}
    >
      <DiscoverMainContent {...mainContentProps} panelsToggle={panelsToggle} />
    </UnifiedHistogramLayout2>
  );
};
