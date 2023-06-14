/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { RefObject } from 'react';
import { UnifiedHistogramContainer } from '@kbn/unified-histogram-plugin/public';
import { css } from '@emotion/react';
import useObservable from 'react-use/lib/useObservable';
import { useSavedSearchInitial } from '../../services/discover_state_provider';
import { useDiscoverHistogram } from './use_discover_histogram';
import { type DiscoverMainContentProps, DiscoverMainContent } from './discover_main_content';
import { ResetSearchButton } from './reset_search_button';
import { useAppStateSelector } from '../../services/discover_app_state_container';

export interface DiscoverHistogramLayoutProps extends DiscoverMainContentProps {
  resizeRef: RefObject<HTMLDivElement>;
}

const histogramLayoutCss = css`
  height: 100%;
`;

export const DiscoverHistogramLayout = ({
  isPlainRecord,
  dataView,
  stateContainer,
  resizeRef,
  ...mainContentProps
}: DiscoverHistogramLayoutProps) => {
  const { dataState } = stateContainer;
  const savedSearch = useSavedSearchInitial();
  const searchSessionId = useObservable(stateContainer.searchSessionManager.searchSessionId$);
  const hideChart = useAppStateSelector((state) => state.hideChart);
  const unifiedHistogramProps = useDiscoverHistogram({
    stateContainer,
    inspectorAdapters: dataState.inspectorAdapters,
    hideChart,
    isPlainRecord,
  });

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
      resizeRef={resizeRef}
      appendHitsCounter={
        savedSearch.id ? (
          <ResetSearchButton resetSavedSearch={stateContainer.actions.undoSavedSearchChanges} />
        ) : undefined
      }
      css={histogramLayoutCss}
    >
      <DiscoverMainContent
        {...mainContentProps}
        stateContainer={stateContainer}
        dataView={dataView}
        isPlainRecord={isPlainRecord}
        // The documents grid doesn't rerender when the chart visibility changes
        // which causes it to render blank space, so we need to force a rerender
        key={`docKey${hideChart}`}
      />
    </UnifiedHistogramContainer>
  );
};
