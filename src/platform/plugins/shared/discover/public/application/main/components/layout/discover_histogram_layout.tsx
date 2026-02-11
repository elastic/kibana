/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { UnifiedHistogramLayout } from '@kbn/unified-histogram';
import { OutPortal } from 'react-reverse-portal';
import { type DiscoverMainContentProps, DiscoverMainContent } from './discover_main_content';
import {
  DEFAULT_HISTOGRAM_KEY_PREFIX,
  selectInitialUnifiedHistogramLayoutPropsMap,
  useCurrentChartPortalNode,
  useCurrentTabRuntimeState,
} from '../../state_management/redux';
import { useAppStateSelector, useCurrentTabSelector } from '../../state_management/redux';

export const DiscoverHistogramLayout = ({
  panelsToggle,
  ...mainContentProps
}: DiscoverMainContentProps) => {
  const hideDataTable = useAppStateSelector((state) => Boolean(state.hideDataTable));
  const chartPortalNode = useCurrentChartPortalNode();
  const currentTabId = useCurrentTabSelector((tab) => tab.id);
  const { localStorageKeyPrefix, layoutPropsMap } = useCurrentTabRuntimeState(
    mainContentProps.stateContainer.runtimeStateManager,
    (tab) => tab.unifiedHistogramConfig$
  );

  // Use layoutPropsMap from tab, or fall back to initial props (incl. default for new tabs)
  // so the layout always renders and the chart can mount/populate layoutPropsMap
  const baseLayoutProps =
    layoutPropsMap[localStorageKeyPrefix ?? DEFAULT_HISTOGRAM_KEY_PREFIX] ??
    selectInitialUnifiedHistogramLayoutPropsMap(
      mainContentProps.stateContainer.runtimeStateManager,
      currentTabId
    )[localStorageKeyPrefix ?? DEFAULT_HISTOGRAM_KEY_PREFIX];

  const layoutProps = useMemo(() => {
    if (!baseLayoutProps) return null;

    if (hideDataTable) {
      return {
        ...baseLayoutProps,
        topPanelHeight: 'max-content' as const,
      };
    }

    return baseLayoutProps;
  }, [baseLayoutProps, hideDataTable]);

  if (!layoutProps) {
    return null;
  }

  return (
    <div
      css={css`
        height: 100%;
        min-height: 0;
      `}
    >
      <UnifiedHistogramLayout
        unifiedHistogramChart={
          chartPortalNode ? (
            <OutPortal node={chartPortalNode} panelsToggle={panelsToggle} />
          ) : null
        }
        {...layoutProps}
      >
        <DiscoverMainContent {...mainContentProps} panelsToggle={panelsToggle} />
      </UnifiedHistogramLayout>
    </div>
  );
};
