/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { RefObject } from 'react';
import { UnifiedHistogramLayout } from '@kbn/unified-histogram-plugin/public';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useDiscoverHistogram } from './use_discover_histogram';
import type { DiscoverSearchSessionManager } from '../../services/discover_search_session';
import type { InspectorAdapters } from '../../hooks/use_inspector';
import {
  type CommonDiscoverHistogramProps,
  DiscoverHistogramContent,
} from './discover_histogram_content';
import { ResetSearchButton } from './reset_search_button';

export interface DiscoverHistogramLayoutProps extends CommonDiscoverHistogramProps {
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
  savedSearchData$,
  state,
  stateContainer,
  isTimeBased,
  resizeRef,
  inspectorAdapters,
  searchSessionManager,
  ...histogramContentProps
}: DiscoverHistogramLayoutProps) => {
  const services = useDiscoverServices();

  const commonInputProps = {
    dataView,
    isPlainRecord,
    stateContainer,
    savedSearch,
    state,
    savedSearchData$,
  };

  const { shouldRender, ...histogramProps } = useDiscoverHistogram({
    isTimeBased,
    inspectorAdapters,
    searchSessionManager,
    ...commonInputProps,
  });

  if (!shouldRender) {
    return null;
  }

  return (
    <UnifiedHistogramLayout
      resizeRef={resizeRef}
      className="dscPageContent__inner"
      services={services}
      dataView={dataView}
      appendHitsCounter={
        savedSearch?.id ? <ResetSearchButton resetSavedSearch={resetSavedSearch} /> : undefined
      }
      {...histogramProps}
    >
      <DiscoverHistogramContent
        {...commonInputProps}
        {...histogramContentProps}
        chartHidden={histogramProps.chart?.hidden}
      />
    </UnifiedHistogramLayout>
  );
};
