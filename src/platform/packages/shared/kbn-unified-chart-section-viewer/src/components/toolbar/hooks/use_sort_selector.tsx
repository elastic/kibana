/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { CHARTS_TOOLBAR_EBT_ELEMENT, EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import type { SelectableEntry } from '@kbn/shared-ux-toolbar-selector';
import { METRICS_SORT_BY, METRICS_SORT_DIRECTION } from '../../../common/constants';
import { SORT_BY_LABELS } from '../sort_selector_helpers';
import type { MetricsSort, MetricsSortBy, MetricsSortDirection } from '../../../types';

interface UseSortSelectorParams {
  sort: MetricsSort;
  onChange: (sort: MetricsSort) => void;
}

export interface UseSortSelectorResult {
  options: SelectableEntry[];
  buttonLabel: string;
  selectedValue: string;
  handleSortByChange: (chosenOption?: SelectableEntry) => void;
  handleDirectionChange: (direction: MetricsSortDirection) => void;
}

export const useSortSelector = ({
  sort,
  onChange,
}: UseSortSelectorParams): UseSortSelectorResult => {
  const { sortField: sortBy, sortDirection: direction } = sort;

  const options = useMemo<SelectableEntry[]>(
    () =>
      Object.values(METRICS_SORT_BY).map((value) => ({
        value,
        label: SORT_BY_LABELS[value],
        checked: value === sortBy ? 'on' : undefined,
        'data-test-subj': `metricsExperienceSortOption-${value}`,
        ...getEbtProps({
          action: EBT_CLICK_ACTIONS.SET_SORT_OPTION,
          element: CHARTS_TOOLBAR_EBT_ELEMENT,
          detail: value,
        }),
      })),
    [sortBy]
  );

  const buttonLabel = useMemo(
    () =>
      i18n.translate('metricsExperience.sortSelector.buttonLabel', {
        defaultMessage: 'Sort: {field}',
        values: { field: SORT_BY_LABELS[sortBy] },
      }),
    [sortBy]
  );

  const handleSortByChange = useCallback(
    (chosenOption?: SelectableEntry) => {
      const nextSortBy = (chosenOption?.value as MetricsSortBy) ?? sortBy;
      onChange({
        sortField: nextSortBy,
        sortDirection:
          nextSortBy === METRICS_SORT_BY.recency ? METRICS_SORT_DIRECTION.asc : direction,
      });
    },
    [onChange, sortBy, direction]
  );

  const handleDirectionChange = useCallback(
    (nextDirection: MetricsSortDirection) => {
      onChange({ sortField: sortBy, sortDirection: nextDirection });
    },
    [onChange, sortBy]
  );

  return { options, buttonLabel, selectedValue: sortBy, handleSortByChange, handleDirectionChange };
};
