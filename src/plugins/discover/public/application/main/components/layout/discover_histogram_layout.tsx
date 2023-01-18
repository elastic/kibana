/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { RefObject } from 'react';
import { UnifiedHistogramLayout } from '@kbn/unified-histogram-plugin/public';
import { css } from '@emotion/react';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useDiscoverHistogram } from './use_discover_histogram';
import type { DiscoverSearchSessionManager } from '../../services/discover_search_session';
import type { InspectorAdapters } from '../../hooks/use_inspector';
import { type DiscoverMainContentProps, DiscoverMainContent } from './discover_main_content';
import { ResetSearchButton } from './reset_search_button';
import { DataFetch$ } from '../../services/discover_data_state_container';

export interface DiscoverHistogramLayoutProps extends DiscoverMainContentProps {
  resetSavedSearch: () => void;
  isTimeBased: boolean;
  resizeRef: RefObject<HTMLDivElement>;
  inspectorAdapters: InspectorAdapters;
  searchSessionManager: DiscoverSearchSessionManager;
  savedSearchFetch$: DataFetch$;
}

export const DiscoverHistogramLayout = ({
  isPlainRecord,
  dataView,
  resetSavedSearch,
  savedSearch,
  savedSearchData$,
  savedSearchFetch$,
  stateContainer,
  isTimeBased,
  resizeRef,
  inspectorAdapters,
  searchSessionManager,
  ...mainContentProps
}: DiscoverHistogramLayoutProps) => {
  const services = useDiscoverServices();

  const commonProps = {
    dataView,
    isPlainRecord,
    stateContainer,
    savedSearch,
    savedSearchData$,
  };

  const histogramProps = useDiscoverHistogram({
    isTimeBased,
    inspectorAdapters,
    searchSessionManager,
    savedSearchFetch$,
    ...commonProps,
  });

  if (!histogramProps) {
    return null;
  }

  const histogramLayoutCss = css`
    height: 100%;
  `;

  return (
    <UnifiedHistogramLayout
      resizeRef={resizeRef}
      services={services}
      dataView={dataView}
      appendHitsCounter={
        savedSearch?.id ? <ResetSearchButton resetSavedSearch={resetSavedSearch} /> : undefined
      }
      css={histogramLayoutCss}
      {...histogramProps}
    >
      <DiscoverMainContent
        {...commonProps}
        {...mainContentProps}
        // The documents grid doesn't rerender when the chart visibility changes
        // which causes it to render blank space, so we need to force a rerender
        key={`docKey${histogramProps.chart?.hidden}`}
      />
    </UnifiedHistogramLayout>
  );
};
