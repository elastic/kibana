/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { FieldStatsBucket } from '../common';
import { h } from './dom';
import type { SearchState } from './query';
import { styles } from './styles';

export type DiscoverLocator = LocatorPublic<DiscoverAppLocatorParams>;

/** Trailblazer searches are not time bounded, so links default to a range covering all documents. */
export const ALL_TIME: TimeRange = { from: '1970-01-01T00:00:00.000Z', to: 'now+1y' };

const DSL_FILTER_ALIAS = 'Trailblazer Query DSL';

export interface DataViewView {
  readonly search: SearchState;
  readonly includeHidden: boolean;
  /** The date field Discover charts over. */
  readonly timeField?: string;
  readonly timeRange?: TimeRange;
  readonly columns?: readonly string[];
}

export interface NumericHistogramView {
  readonly search: SearchState;
  readonly includeHidden: boolean;
  readonly field: string;
  readonly interval: number;
}

/** Discover parameters showing the same documents as a Trailblazer search, through an ad hoc data view. */
export function dataViewParams({
  search,
  includeHidden,
  timeField,
  timeRange,
  columns,
}: DataViewView): DiscoverAppLocatorParams | undefined {
  const { index, language, query } = search;
  const dataViewId = `trailblazer:${index}:${timeField ?? ''}`;
  const base: DiscoverAppLocatorParams = {
    dataViewSpec: {
      id: dataViewId,
      title: index,
      name: index,
      timeFieldName: timeField,
      allowHidden: includeHidden,
    },
    timeRange: timeRange ?? ALL_TIME,
    ...(columns ? { columns: [...columns] } : {}),
  };
  if (language !== 'dsl') {
    const kqlOrLucene: Query = { language: language === 'kql' ? 'kuery' : 'lucene', query };
    return { ...base, query: kqlOrLucene };
  }
  const dsl = parseDsl(query);
  if (dsl === null) return undefined;
  if (dsl === undefined) return base;
  const filter: Filter = {
    meta: {
      index: dataViewId,
      type: 'custom',
      alias: DSL_FILTER_ALIAS,
      disabled: false,
      negate: false,
    },
    query: dsl,
    $state: { store: FilterStateStore.APP_STATE },
  };
  return { ...base, filters: [filter] };
}

/**
 * Discover parameters charting a numeric field's histogram with ES|QL. Query DSL has no ES|QL
 * equivalent, so DSL searches fall back to a data view listing the field.
 */
export function numericHistogramParams({
  search,
  includeHidden,
  field,
  interval,
}: NumericHistogramView): DiscoverAppLocatorParams | undefined {
  const { index, language, query } = search;
  if (language === 'dsl') return dataViewParams({ search, includeHidden, columns: [field] });

  const trimmed = query.trim();
  const fieldName = esqlIdentifier(field);
  const lines = [
    `FROM ${index
      .split(',')
      .map((pattern) => esqlString(pattern.trim()))
      .join(', ')}`,
    trimmed ? `| WHERE ${language === 'kql' ? 'KQL' : 'QSTR'}(${esqlString(trimmed)})` : undefined,
    `| WHERE ${fieldName} IS NOT NULL`,
    `| STATS count = COUNT(*) BY bucket = BUCKET(${fieldName}, ${interval})`,
    '| SORT bucket',
  ];
  return {
    query: { esql: lines.filter(Boolean).join('\n') },
    timeRange: ALL_TIME,
  };
}

/** The time range spanned by date histogram buckets. */
export function bucketTimeRange(buckets: readonly FieldStatsBucket[]): TimeRange | undefined {
  const first = buckets[0];
  const last = buckets[buckets.length - 1];
  if (!first || !last) return undefined;
  return { from: String(first.key), to: String(last.to ?? ALL_TIME.to) };
}

/** A link opening Discover with `params`, or null when Discover is unavailable. */
export function discoverLink(
  locator: DiscoverLocator | undefined,
  params: DiscoverAppLocatorParams | undefined
): HTMLAnchorElement | null {
  if (!locator || !params) return null;
  return h('a', {
    className: styles.discoverLink,
    text: 'Open in Discover ↗',
    title: 'Open this view in Discover',
    attrs: { href: locator.getRedirectUrl(params), 'data-test-subj': 'trailblazerDiscoverLink' },
  });
}

/** Parses a DSL query; undefined means empty, null means invalid. */
function parseDsl(query: string): Record<string, unknown> | undefined | null {
  const trimmed = query.trim();
  if (trimmed === '') return undefined;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? Object.fromEntries(Object.entries(parsed))
      : null;
  } catch {
    return null;
  }
}

export function esqlIdentifier(name: string): string {
  return `\`${name.replace(/`/g, '``')}\``;
}

export function esqlString(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
  return `"${escaped}"`;
}
