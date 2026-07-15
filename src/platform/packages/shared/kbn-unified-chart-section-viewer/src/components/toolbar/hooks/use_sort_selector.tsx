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
import type { SelectableEntry } from '@kbn/shared-ux-toolbar-selector';
import { METRICS_SORT_BY } from '../../../common/constants';
import type { MetricsSort, MetricsSortBy, MetricsSortDirection } from '../../../types';
import { SORT_BY_LABELS } from '../sort_selector_helpers';

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
  const [sortBy, direction] = sort;

  const options = useMemo<SelectableEntry[]>(
    () =>
      Object.values(METRICS_SORT_BY).map((value) => ({
        value,
        label: SORT_BY_LABELS[value],
        checked: value === sortBy ? 'on' : undefined,
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
      onChange([nextSortBy, direction]);
    },
    [onChange, sortBy, direction]
  );

  const handleDirectionChange = useCallback(
    (nextDirection: MetricsSortDirection) => {
      onChange([sortBy, nextDirection]);
    },
    [onChange, sortBy]
  );

  return { options, buttonLabel, selectedValue: sortBy, handleSortByChange, handleDirectionChange };
};
