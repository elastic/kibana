/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { METRICS_SORT_BY, METRICS_SORT_DIRECTION } from '../../common/constants';
import type { MetricsSortBy, MetricsSortDirection } from '../../types';

// User-facing label per sort field. Extend as new fields are added.
export const SORT_BY_LABELS: Record<MetricsSortBy, string> = {
  [METRICS_SORT_BY.alphabetically]: i18n.translate(
    'metricsExperience.sortSelector.alphabetically',
    {
      defaultMessage: 'Alphabetically',
    }
  ),
};

const directionLegend = i18n.translate('metricsExperience.sortSelector.directionLegend', {
  defaultMessage: 'Sort direction',
});

const directionOptions = [
  {
    id: METRICS_SORT_DIRECTION.asc,
    iconType: 'sortAscending',
    'data-test-subj': 'metricsExperienceSortDirectionAsc',
    label: i18n.translate('metricsExperience.sortSelector.ascending', {
      defaultMessage: 'Ascending',
    }),
  },
  {
    id: METRICS_SORT_DIRECTION.desc,
    iconType: 'sortDescending',
    'data-test-subj': 'metricsExperienceSortDirectionDesc',
    label: i18n.translate('metricsExperience.sortSelector.descending', {
      defaultMessage: 'Descending',
    }),
  },
];

interface SortDirectionToggleProps {
  direction: MetricsSortDirection;
  onChange: (direction: MetricsSortDirection) => void;
}

export const SortDirectionToggle = ({ direction, onChange }: SortDirectionToggleProps) => (
  <EuiButtonGroup
    isIconOnly
    buttonSize="compressed"
    legend={directionLegend}
    options={directionOptions}
    idSelected={direction}
    onChange={(id) => onChange(id as MetricsSortDirection)}
  />
);
