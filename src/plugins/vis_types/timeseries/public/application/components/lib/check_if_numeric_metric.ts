/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import { getIndexPatternKey } from '../../../../common/index_patterns_utils';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';

import type { Metric, IndexPatternValue } from '../../../../common/types';
import type { VisFields } from '../../lib/fetch_fields';

// this function checks if metric has numeric value result
export const checkIfNumericMetric = (
  metric: Metric,
  fields: VisFields,
  indexPattern: IndexPatternValue
) => {
  // currently only Top Hit could have not numeric value result
  if (metric?.type === TSVB_METRIC_TYPES.TOP_HIT) {
    const selectedField = fields[getIndexPatternKey(indexPattern)]?.find(
      ({ name }) => name === metric?.field
    );
    return selectedField?.type === KBN_FIELD_TYPES.NUMBER;
  }
  return true;
};
