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
import { useDiscoverHistogram } from './use_discover_histogram';
import type { DiscoverSearchSessionManager } from '../../services/discover_search_session';
import type { InspectorAdapters } from '../../hooks/use_inspector';
import { type DiscoverMainContentProps, DiscoverMainContent } from './discover_main_content';
import { ResetSearchButton } from './reset_search_button';

export interface DiscoverHistogramLayoutProps extends DiscoverMainContentProps {
  resetSavedSearch: () => void;
  isTimeBased: boolean;
  resizeRef: RefObject<HTMLDivElement>;
  inspectorAdapters: InspectorAdapters;
  searchSessionManager: DiscoverSearchSessionManager;
}

export const DiscoverHistogramLayout = ({
  isPlainRecord,
  dataView,
  resetSavedSearch,
  savedSearch,
  stateContainer,
  isTimeBased,
  resizeRef,
  inspectorAdapters,
  searchSessionManager,
  ...mainContentProps
}: DiscoverHistogramLayoutProps) => {
  const commonProps = {
    dataView,
    isPlainRecord,
    stateContainer,
    savedSearchData$: stateContainer.dataState.data$,
  };

  const { hideChart, setUnifiedHistogramApi } = useDiscoverHistogram({
    isTimeBased,
    inspectorAdapters,
    searchSessionManager,
    savedSearchFetch$: stateContainer.dataState.fetch$,
    ...commonProps,
  });

  const histogramLayoutCss = css`
    height: 100%;
  `;

  return (
    <UnifiedHistogramContainer
      ref={setUnifiedHistogramApi}
      resizeRef={resizeRef}
      appendHitsCounter={
        savedSearch?.id ? <ResetSearchButton resetSavedSearch={resetSavedSearch} /> : undefined
      }
      css={histogramLayoutCss}
    >
      <DiscoverMainContent
        {...commonProps}
        {...mainContentProps}
        savedSearch={savedSearch}
        // The documents grid doesn't rerender when the chart visibility changes
        // which causes it to render blank space, so we need to force a rerender
        key={`docKey${hideChart}`}
      />
    </UnifiedHistogramContainer>
  );
};
