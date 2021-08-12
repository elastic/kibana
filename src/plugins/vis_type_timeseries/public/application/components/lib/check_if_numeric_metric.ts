/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getIndexPatternKey } from '../../../../common/index_patterns_utils';
import { METRIC_TYPES } from '../../../../common/enums';

import type { Metric, IndexPatternValue } from '../../../../common/types';
import type { VisFields } from '../../lib/fetch_fields';

export const checkIfNumericMetric = (
  metric: Metric,
  fields: VisFields,
  indexPattern: IndexPatternValue
) => {
  if (metric?.type === METRIC_TYPES.TOP_HIT) {
    const selectedField = fields[getIndexPatternKey(indexPattern)]?.find(
      ({ name }) => name === metric?.field
    );
    return selectedField?.type === 'number';
  }
  return true;
};
