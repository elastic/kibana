/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import { EXEMPLARS_VALUE_FIELD, METRIC_FIELD_PREFIX } from '../../constants';

/**
 * Adapts Discover filters to the exemplars schema, where one metric's sample lives in `value`
 * rather than a `metrics.<name>` field. A filter on the chart's own metric field is rewritten
 * onto `value`; a filter on any other metric field cannot apply to this metric's exemplars and
 * is dropped. Dimension and resource filters pass through unchanged. `SET unmapped_fields`
 * does not help here because these become a request-level DSL filter, not ES|QL.
 */
export const translateExemplarFilters = (filters: Filter[], metricName: string): Filter[] =>
  filters.flatMap((filter) => {
    const key = filter.meta?.key;
    if (!key || !key.startsWith(METRIC_FIELD_PREFIX)) {
      return [filter];
    }
    return key === metricName ? [renameFilterField(filter, key, EXEMPLARS_VALUE_FIELD)] : [];
  });

const renameFilterField = (filter: Filter, from: string, to: string): Filter => {
  const { meta, $state, ...rest } = filter;
  return {
    ...(renameFieldKeys(rest, from, to) as Omit<Filter, 'meta' | '$state'>),
    meta: { ...meta, key: to },
    ...($state ? { $state } : {}),
  };
};

// Renames the field wherever a DSL clause names it: as an object key (`match_phrase`, `range`,
// `term`) or as an `exists` / `field` value. Values other than field names are left alone.
const renameFieldKeys = (node: unknown, from: string, to: string): unknown => {
  if (Array.isArray(node)) {
    return node.map((item) => renameFieldKeys(item, from, to));
  }
  if (node === null || typeof node !== 'object') {
    return node;
  }
  return Object.fromEntries(
    Object.entries(node as Record<string, unknown>).map(([key, value]) => {
      if (key === from) {
        return [to, renameFieldKeys(value, from, to)];
      }
      if (key === 'field' && value === from) {
        return [key, to];
      }
      return [key, renameFieldKeys(value, from, to)];
    })
  );
};
