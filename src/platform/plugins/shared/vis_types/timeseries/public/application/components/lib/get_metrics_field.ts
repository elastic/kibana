/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { last } from 'lodash';
import { Metric } from '../../../../common/types';
import { getAggByPredicate, isBasicAgg } from '../../../../common/agg_utils';

export const getMetricsField = (metrics: Metric[]) => {
  const selectedMetric = last(metrics);

  if (selectedMetric) {
    const { isFieldRequired, isFieldFormattingDisabled } = getAggByPredicate(
      selectedMetric.type
    )?.meta;

    if (isFieldRequired && !isFieldFormattingDisabled) {
      return isBasicAgg(selectedMetric)
        ? selectedMetric.field
        : metrics.find(({ id }) => selectedMetric.field === id)?.field;
    }
  }
};
