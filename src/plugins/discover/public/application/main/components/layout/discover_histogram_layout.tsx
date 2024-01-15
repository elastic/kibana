/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { UnifiedHistogramContainer } from '@kbn/unified-histogram-plugin/public';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';
import { useDiscoverHistogram } from './use_discover_histogram';
import { type DiscoverMainContentProps, DiscoverMainContent } from './discover_main_content';
import { useAppStateSelector } from '../../services/discover_app_state_container';

export interface DiscoverHistogramLayoutProps extends DiscoverMainContentProps {
  container: HTMLElement | null;
}

const histogramLayoutCss = css`
  height: 100%;
`;

export const DiscoverHistogramLayout = ({
  isPlainRecord,
  dataView,
  stateContainer,
  container,
  panelsToggle,
  ...mainContentProps
}: DiscoverHistogramLayoutProps) => {
  const { dataState } = stateContainer;
  const searchSessionId = useObservable(stateContainer.searchSessionManager.searchSessionId$);
  const hideChart = useAppStateSelector((state) => state.hideChart);
  const unifiedHistogramProps = useDiscoverHistogram({
    stateContainer,
    inspectorAdapters: dataState.inspectorAdapters,
    hideChart,
    isPlainRecord,
  });

  const renderCustomChartToggleActions = useCallback(
    () =>
      React.isValidElement(panelsToggle)
        ? React.cloneElement(panelsToggle, { renderedFor: 'histogram' })
        : panelsToggle,
    [panelsToggle]
  );

  // Initialized when the first search has been requested or
  // when in text-based mode since search sessions are not supported
  if (!searchSessionId && !isPlainRecord) {
    return null;
  }

  return (
    <UnifiedHistogramContainer
      {...unifiedHistogramProps}
      searchSessionId={searchSessionId}
      requestAdapter={dataState.inspectorAdapters.requests}
      container={container}
      css={histogramLayoutCss}
      renderCustomChartToggleActions={renderCustomChartToggleActions}
    >
      <DiscoverMainContent
        {...mainContentProps}
        stateContainer={stateContainer}
        dataView={dataView}
        isPlainRecord={isPlainRecord}
        panelsToggle={panelsToggle}
      />
    </UnifiedHistogramContainer>
  );
};
