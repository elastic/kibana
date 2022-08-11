/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';

export function getSupportedFieldsByMetricType(type) {
  switch (type) {
    case METRIC_TYPES.CARDINALITY:
      return Object.values(KBN_FIELD_TYPES).filter((t) => t !== KBN_FIELD_TYPES.HISTOGRAM);
    case TSVB_METRIC_TYPES.VALUE_COUNT:
      return Object.values(KBN_FIELD_TYPES);
    case METRIC_TYPES.AVG:
    case METRIC_TYPES.SUM:
    case METRIC_TYPES.MIN:
    case METRIC_TYPES.MAX:
      return [KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.HISTOGRAM];
    default:
      return [KBN_FIELD_TYPES.NUMBER];
  }
}
