/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GetGroupStats } from '@kbn/grouping/src';
import { ALERT_INSTANCE_ID, ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import type { DataByGroupingAgg } from './types';

/**
 * A function that given the current grouping field and aggregation results, returns an array of
 * stat items to be rendered in the group panel
 */
export const getGroupStats: GetGroupStats<DataByGroupingAgg> = (field, bucket) => {
  const defaultBadges = [
    {
      title: 'Documents:',
      badge: {
        value: bucket.doc_count,
        width: 50,
      },
    },
  ];

  switch (field) {
    case ALERT_RULE_NAME:
      return [
        {
          title: 'Sources:',
          badge: {
            value: bucket.sourceCountAggregation?.value ?? 0,
            width: 50,
          },
        },
        ...defaultBadges,
      ];
    case ALERT_INSTANCE_ID:
      return [
        {
          title: 'Docs:',
          badge: {
            value: bucket.docsCountAggregation?.value ?? 0,
            width: 50,
          },
        },
        ...defaultBadges,
      ];
  }
  return [...defaultBadges];
};
