/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { UnifiedHistogramLayout } from '@kbn/unified-histogram-plugin/public';
import { OutPortal } from 'react-reverse-portal';
import { type DiscoverMainContentProps, DiscoverMainContent } from './discover_main_content';
import { useCurrentTabChartPortalNode, useCurrentTabSelector } from '../../state_management/redux';

export interface DiscoverHistogramLayoutProps2 extends DiscoverMainContentProps {
  container: HTMLElement | null;
}

export const DiscoverHistogramLayout = ({
  container,
  panelsToggle,
  ...mainContentProps
}: DiscoverHistogramLayoutProps2) => {
  const chartPortalNode = useCurrentTabChartPortalNode();
  const layoutProps = useCurrentTabSelector((tab) => tab.unifiedHistogramLayoutProps);

  return (
    <UnifiedHistogramLayout
      container={container}
      chartPanel={
        chartPortalNode ? <OutPortal node={chartPortalNode} panelsToggle={panelsToggle} /> : null
      }
      {...layoutProps}
    >
      <DiscoverMainContent {...mainContentProps} panelsToggle={panelsToggle} />
    </UnifiedHistogramLayout>
  );
};
