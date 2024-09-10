/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type KueryNode, nodeTypes } from '@kbn/es-query';
import { USAGE_COUNTERS_SAVED_OBJECT_TYPE } from '../saved_objects';
import type { UsageCountersSearchFilters } from '../types';

export function usageCountersSearchParamsToKueryFilter(
  params: Omit<UsageCountersSearchFilters, 'namespace'>
): KueryNode {
  const { domainId, counterName, counterType, source, from, to } = params;

  const isFilters = filtersToKueryNodes({ domainId, counterName, counterType, source });
  // add a date range filters
  if (from) {
    isFilters.push(
      nodeTypes.function.buildNode(
        'range',
        `${USAGE_COUNTERS_SAVED_OBJECT_TYPE}.updated_at`,
        'gte',
        from
      )
    );
  }
  if (to) {
    isFilters.push(
      nodeTypes.function.buildNode(
        'range',
        `${USAGE_COUNTERS_SAVED_OBJECT_TYPE}.updated_at`,
        'lte',
        to
      )
    );
  }
  return nodeTypes.function.buildNode('and', isFilters);
}

function filtersToKueryNodes(filters: Partial<Record<string, string>>): KueryNode[] {
  return Object.entries(filters)
    .filter(([, attributeValue]) => typeof attributeValue === 'string' && attributeValue)
    .map(([attributeName, attributeValue]) =>
      nodeTypes.function.buildNode(
        'is',
        `${USAGE_COUNTERS_SAVED_OBJECT_TYPE}.attributes.${attributeName}`,
        attributeValue
      )
    );
}
