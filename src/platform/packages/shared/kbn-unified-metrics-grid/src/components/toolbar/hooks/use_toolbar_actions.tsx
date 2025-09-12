/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { IconButtonGroupProps } from '@kbn/shared-ux-button-toolbar';
import { i18n } from '@kbn/i18n';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import useDebounce from 'react-use/lib/useDebounce';
import { useMetricsGridState } from '../../../hooks';
import { DimensionsSelector } from '../dimensions_selector';
import { ValuesSelector } from '../values_selector';

interface UseToolbarActionsProps
  extends Pick<ChartSectionProps, 'requestParams' | 'renderToggleActions'> {
  fields: MetricField[];
  indexPattern: string;
  setDebouncedSearchTerm: (value: string) => void;
}
export const useToolbarActions = ({
  fields,
  requestParams,
  indexPattern,
  renderToggleActions,
  setDebouncedSearchTerm,
}: UseToolbarActionsProps) => {
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

  const leftSideActions = useMemo(
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
          timeRange={requestParams.getTimeRange()}
          onClear={onClearValues}
        />
      ) : null,
    ],
    [
      dimensions,
      fields,
      indexPattern,
      onClearAllDimensions,
      onClearValues,
      onDimensionsChange,
      onValuesChange,
      renderToggleActions,
      requestParams,
      valueFilters,
    ]
  );

  const rightSideActions: IconButtonGroupProps['buttons'] = [
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

  return { leftSideActions, rightSideActions, onClearSearch, showSearchInput };
};
