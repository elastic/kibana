/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { UnifiedHistogramContainer } from '@kbn/unified-histogram-plugin/public';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';
import { useDiscoverHistogram } from './use_discover_histogram';
import { type DiscoverMainContentProps, DiscoverMainContent } from './discover_main_content';
import { useAppStateSelector } from '../../state_management/discover_app_state_container';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';

export interface DiscoverHistogramLayoutProps extends DiscoverMainContentProps {
  container: HTMLElement | null;
}

const histogramLayoutCss = css`
  height: 100%;
`;

export const DiscoverHistogramLayout = ({
  dataView,
  stateContainer,
  container,
  panelsToggle,
  ...mainContentProps
}: DiscoverHistogramLayoutProps) => {
  const { dataState } = stateContainer;
  const searchSessionId = useObservable(stateContainer.searchSessionManager.searchSessionId$);
  const hideChart = useAppStateSelector((state) => state.hideChart);
  const isEsqlMode = useIsEsqlMode();
  const unifiedHistogramProps = useDiscoverHistogram({
    stateContainer,
    inspectorAdapters: dataState.inspectorAdapters,
    hideChart,
  });

  const renderCustomChartToggleActions = useCallback(
    () =>
      React.isValidElement(panelsToggle)
        ? React.cloneElement(panelsToggle, { renderedFor: 'histogram' })
        : panelsToggle,
    [panelsToggle]
  );

  // Initialized when the first search has been requested or
  // when in ES|QL mode since search sessions are not supported
  if (!searchSessionId && !isEsqlMode) {
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
      abortController={stateContainer.dataState.getAbortController()}
    >
      <DiscoverMainContent
        {...mainContentProps}
        stateContainer={stateContainer}
        dataView={dataView}
        panelsToggle={panelsToggle}
      />
    </UnifiedHistogramContainer>
  );
};
