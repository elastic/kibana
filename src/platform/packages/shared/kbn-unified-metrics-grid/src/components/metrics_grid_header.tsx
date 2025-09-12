/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { ChartSectionTemplate } from '@kbn/unified-histogram';
import type { SerializedStyles } from '@emotion/serialize';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import { useMetricsGridState } from '../hooks';
import { FullScreenWrapper } from './fullscreen_wrapper/fullscreen_wrapper';
import { SearchInput } from './toolbar/search_input/search_input';
import { useToolbarActions } from './toolbar/hooks/use_toolbar_actions';

export interface MetricsGridHeaderProps
  extends Pick<ChartSectionProps, 'requestParams' | 'renderToggleActions'> {
  indexPattern: string;
  chartToolbarCss?: SerializedStyles;
  setDebouncedSearchTerm: (value: string) => void;
  fields: MetricField[];
  children?: React.ReactNode;
}

export const MetricsGridHeader = ({
  indexPattern,
  renderToggleActions,
  chartToolbarCss,
  requestParams,
  setDebouncedSearchTerm,
  fields,
  children,
}: MetricsGridHeaderProps) => {
  const { leftSideActions, rightSideActions, onClearSearch, showSearchInput } = useToolbarActions({
    fields,
    indexPattern,
    renderToggleActions,
    setDebouncedSearchTerm,
    requestParams,
  });
  const { searchTerm, onSearchTermChange, isFullscreen } = useMetricsGridState();

  return (
    <FullScreenWrapper isFullscreen={isFullscreen} dataTestSubj="metricsExperienceGrid">
      <ChartSectionTemplate
        id="metricsExperienceGridPanel"
        toolbarCss={chartToolbarCss}
        toolbar={{
          leftSide: leftSideActions,
          rightSide: rightSideActions,
          additionalControls: {
            prependRight: (
              <SearchInput
                showSearchInput={showSearchInput}
                searchTerm={searchTerm}
                onSearchTermChange={onSearchTermChange}
                onClear={onClearSearch}
                data-test-subj="metricsExperienceToolbarSearchInput"
              />
            ),
          },
        }}
      >
        {children}
      </ChartSectionTemplate>
    </FullScreenWrapper>
  );
};
