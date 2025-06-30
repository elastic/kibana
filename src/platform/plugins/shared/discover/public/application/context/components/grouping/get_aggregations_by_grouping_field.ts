/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NamedAggregation } from '@kbn/grouping';
import { ALERT_INSTANCE_ID, ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';

/**
 * Resolves an array of aggregations for a given grouping field
 */
export const getAggregationsByGroupingField = (field: string): NamedAggregation[] => {
  switch (field) {
    case ALERT_RULE_NAME:
      return [
        {
          sourceCountAggregation: {
            cardinality: {
              field: ALERT_INSTANCE_ID,
            },
          },
        },
      ];
    case '':
      return [
        {
          docsCountAggregation: {
            cardinality: {
              field: ALERT_RULE_UUID,
            },
          },
        },
      ];
    default:
      return [
        {
          docsCountAggregation: {
            cardinality: {
              field: ALERT_RULE_UUID,
            },
          },
        },
      ];
  }
};
