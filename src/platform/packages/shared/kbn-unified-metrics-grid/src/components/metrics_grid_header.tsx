/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { ChartSectionTemplate } from '@kbn/unified-histogram';
import type { IconButtonGroupProps } from '@kbn/shared-ux-button-toolbar';
import { i18n } from '@kbn/i18n';
import useDebounce from 'react-use/lib/useDebounce';
import type { SerializedStyles } from '@emotion/serialize';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import { DimensionsSelector } from './toolbar/dimensions_selector';
import { ValuesSelector } from './toolbar/values_selector';
import { useMetricsGridState } from '../hooks';
import { FullScreenWrapper } from './fullscreen_wrapper/fullscreen_wrapper';
import { SearchInput } from './search_input/search_input';

export interface MetricsGridHeaderProps {
  indexPattern: string;
  renderToggleActions: () => React.ReactNode;
  chartToolbarCss?: SerializedStyles;
  getTimeRange: () => { from: string; to: string };
  setDebouncedSearchTerm: (value: string) => void;
  fields: MetricField[];
  children?: React.ReactNode;
}

export const MetricsGridHeader = ({
  indexPattern,
  renderToggleActions,
  chartToolbarCss,
  getTimeRange,
  setDebouncedSearchTerm,
  fields,
  children,
}: MetricsGridHeaderProps) => {
  const {
    dimensions,
    valueFilters,
    onDimensionsChange,
    onValuesChange,
    onClearValues,
    onClearAllDimensions,
    onClearSearchTerm,
    isFullscreen,
    onToggleFullscreen,
    searchTerm,
    onSearchTermChange,
  } = useMetricsGridState();

  const [showSearchInput, setShowSearchInput] = useState(false);

  useDebounce(
    () => {
      setDebouncedSearchTerm(searchTerm);
    },
    300,
    [searchTerm]
  );

  const onShowSearch = useCallback(() => {
    setShowSearchInput(true);
  }, []);

  const onClearSearch = useCallback(() => {
    setShowSearchInput(false);
    onClearSearchTerm();
    setDebouncedSearchTerm('');
  }, [onClearSearchTerm, setDebouncedSearchTerm]);

  const actions: IconButtonGroupProps['buttons'] = [
    ...(!showSearchInput
      ? [
          {
            iconType: 'search',
            label: i18n.translate('metricsExperience.searchButton', {
              defaultMessage: 'Search',
            }),
            onClick: onShowSearch,
            'data-test-subj': 'metricsExperienceToolbarSearch',
          },
        ]
      : []),
    {
      iconType: isFullscreen ? 'fullScreenExit' : 'fullScreen',
      label: isFullscreen
        ? i18n.translate('metricsExperience.fullScreenExitButton', {
            defaultMessage: 'Exit fullscreen',
          })
        : i18n.translate('metricsExperience.fullScreenButton', {
            defaultMessage: 'Enter fullscreen',
          }),
      onClick: onToggleFullscreen,
      'data-test-subj': 'metricsExperienceToolbarFullScreen',
      className: showSearchInput ? 'nextToSearchInput' : undefined,
    },
  ];

  const rightSideComponents = useMemo(
    () => [
      renderToggleActions(),
      <DimensionsSelector
        fields={fields}
        onChange={onDimensionsChange}
        selectedDimensions={dimensions}
        onClear={onClearAllDimensions}
      />,
      dimensions.length > 0 ? (
        <ValuesSelector
          selectedDimensions={dimensions}
          selectedValues={valueFilters}
          onChange={onValuesChange}
          disabled={dimensions.length === 0}
          indices={[indexPattern]}
          timeRange={getTimeRange()}
          onClear={onClearValues}
        />
      ) : null,
    ],
    [
      dimensions,
      fields,
      getTimeRange,
      indexPattern,
      onClearAllDimensions,
      onClearValues,
      onDimensionsChange,
      onValuesChange,
      renderToggleActions,
      valueFilters,
    ]
  );

  return (
    <FullScreenWrapper isFullscreen={isFullscreen} dataTestSubj="metricsExperienceGrid">
      <ChartSectionTemplate
        id="metricsExperienceGridPanel"
        toolbarCss={chartToolbarCss}
        toolbar={{
          leftSide: rightSideComponents,
          rightSide: actions,
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
