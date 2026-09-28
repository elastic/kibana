/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  appendToESQLQuery,
  convertTimeseriesCommandToFrom,
  formatEsqlIdentifier,
  formatEsqlLiteral,
} from '@kbn/esql-utils';
import type { IEsqlSearchResult } from '@kbn/search-types';
import type { ActivityIncrease } from '../../../../../common/activity_investigation/activity_increase';
import type { ContributorField, ActivityFieldMeasurement } from './collect_activity_contributors';

type Execute = (query: string) => Promise<{ rawResponse: IEsqlSearchResult['rawResponse'] }>;

/** Fetches numeric measurements and the strongest categorical contributors in two fixed windows. */
export const readActivityContributors = async ({
  query,
  timeFieldName,
  columns,
  fields,
  totalIncrease,
  maxResults,
  execute,
  signal,
}: {
  query: string;
  timeFieldName: string;
  columns: readonly { readonly name: string }[];
  fields: readonly ContributorField[];
  totalIncrease: ActivityIncrease;
  maxResults: number;
  execute: Execute;
  signal: AbortSignal;
}): Promise<{ measurements: ActivityFieldMeasurement[]; complete: boolean }> => {
  const reference = totalIncrease.referenceTimeRange;
  if (!reference || !fields.length) return { measurements: [], complete: true };
  let complete = true;
  let prefix = '__discover_contributor';
  while (columns.some(({ name }) => name.startsWith(prefix))) prefix += '_';
  const period = `${prefix}_period`;
  const fieldColumn = `${prefix}_field`;
  const valueColumn = `${prefix}_value`;
  const currentColumn = `${prefix}_current`;
  const previousColumn = `${prefix}_previous`;
  const time = formatEsqlIdentifier(timeFieldName);
  const inWindow = (start: number, end: number): string =>
    `${time} >= ${formatEsqlLiteral(new Date(start))}::datetime AND ${time} < ${formatEsqlLiteral(
      new Date(end)
    )}::datetime`;
  // Append after the user's pipeline: an existing LIMIT must still select the same current-view rows.
  const windowQuery = appendToESQLQuery(
    convertTimeseriesCommandToFrom(query),
    `| EVAL ${period} = CASE(${inWindow(
      totalIncrease.startTimeMs,
      totalIncrease.endTimeMs
    )}, 0, ${inWindow(
      reference.startTimeMs,
      reference.endTimeMs
    )}, 1, null) | WHERE ${period} IS NOT NULL`
  );
  const referenceBuckets = (reference.endTimeMs - reference.startTimeMs) / totalIncrease.intervalMs;
  const expressions = [
    `${currentColumn} = COUNT(*) WHERE ${period} == 0`,
    `${previousColumn} = COUNT(*) WHERE ${period} == 1`,
    ...fields.flatMap(({ name, metric }, index) => {
      const field = formatEsqlIdentifier(name);
      return metric === 'field_sum'
        ? [
            `${prefix}_sum_${index}_current = SUM(${field}) WHERE ${period} == 0`,
            `${prefix}_sum_${index}_previous = SUM(${field}) WHERE ${period} == 1`,
            `${prefix}_min_${index} = MIN(${field})`,
          ]
        : [`${prefix}_present_${index} = COUNT(MV_MIN(${field}))`];
    }),
  ];
  signal.throwIfAborted();
  const { rawResponse: profile } = await execute(
    appendToESQLQuery(windowQuery, `| STATS ${expressions.join(', ')} | LIMIT 2`)
  );
  if (profile.values.length !== 1) return { measurements: [], complete: false };
  const profileRow = profile.values[0];
  const number = (name: string, emptySum = false): number => {
    const value = profileRow[profile.columns.findIndex((column) => column.name === name)];
    if (emptySum && value === null) return 0;
    return typeof value === 'number' ? value : Number.NaN;
  };
  const currentTotal = number(currentColumn);
  const previousTotal = number(previousColumn);
  // A refresh or nondeterministic pipeline must not silently combine different populations.
  if (
    currentTotal !== totalIncrease.observedTotal ||
    previousTotal !== Math.round(totalIncrease.baseline * referenceBuckets)
  ) {
    return { measurements: [], complete: false };
  }

  const measurements: ActivityFieldMeasurement[] = [];
  const categorical: Array<{ field: ContributorField; index: number }> = [];
  fields.forEach((field, index) => {
    if (field.metric === 'field_sum') {
      if (!(number(`${prefix}_min_${index}`) >= 0)) return;
      measurements.push({
        field,
        observed: number(`${prefix}_sum_${index}_current`, true),
        previous: number(`${prefix}_sum_${index}_previous`, true),
      });
      return;
    }
    const present = number(`${prefix}_present_${index}`);
    if (present === 0) return;
    if (!Number.isSafeInteger(present) || present < 0 || present > currentTotal + previousTotal) {
      complete = false;
      return;
    }
    categorical.push({ field, index });
  });

  if (categorical.length) {
    signal.throwIfAborted();
    const ids = categorical.map(({ index }) => index);
    const choices = categorical.flatMap(({ field, index }) => [
      `${fieldColumn} == ${index}`,
      `TO_STRING(${formatEsqlIdentifier(field.name)})`,
    ]);
    const excessColumn = `${prefix}_excess`;
    const tierColumn = `${prefix}_tier`;
    const coverageCurrent = `${prefix}_coverage_current`;
    const coveragePrevious = `${prefix}_coverage_previous`;
    const tiers = categorical.flatMap(({ field, index }) => [
      `${fieldColumn} == ${index}`,
      String(field.tier),
    ]);
    // Requires INLINE STATS and ordered LIMIT BY (esql_topn_by); no browser pagination.
    // Reduce to one value per field before applying the selector's priority and result limit.
    const groupedQuery = appendToESQLQuery(
      windowQuery,
      `| EVAL ${fieldColumn} = ${ids.length === 1 ? ids[0] : `[${ids.join(', ')}]`}
       | MV_EXPAND ${fieldColumn}
       | EVAL ${valueColumn} = MV_DEDUPE(CASE(${choices.join(', ')}, null))
       | MV_EXPAND ${valueColumn}
       | STATS ${currentColumn} = COUNT(*) WHERE ${period} == 0,
               ${previousColumn} = COUNT(*) WHERE ${period} == 1
         BY ${fieldColumn}, ${valueColumn}
       | INLINE STATS ${coverageCurrent} = SUM(${currentColumn}),
                      ${coveragePrevious} = SUM(${previousColumn}) BY ${fieldColumn}
       | EVAL ${excessColumn} = ${currentColumn} - TO_DOUBLE(${previousColumn}) / ${referenceBuckets} * ${
        totalIncrease.bucketCount
      },
              ${tierColumn} = CASE(${tiers.join(', ')}, null)
       | WHERE ${excessColumn} > 0 AND NOT (${currentColumn} == ${currentTotal} AND ${previousColumn} == ${previousTotal})
       | SORT ${fieldColumn} ASC, ${excessColumn} DESC, ${valueColumn} ASC NULLS FIRST
       | LIMIT 1 BY ${fieldColumn}
       | SORT ${tierColumn} ASC, ${excessColumn} DESC, ${fieldColumn} ASC
       | LIMIT ${maxResults}`
    );
    try {
      const { rawResponse } = await execute(groupedQuery);
      const names = [
        fieldColumn,
        valueColumn,
        currentColumn,
        previousColumn,
        coverageCurrent,
        coveragePrevious,
      ];
      const indexes = names.map((name) =>
        rawResponse.columns.findIndex((column) => column.name === name)
      );
      if (indexes.some((index) => index < 0) || rawResponse.values.length > maxResults) {
        return { measurements, complete: false };
      }
      const [
        fieldIndex,
        valueIndex,
        currentIndex,
        previousIndex,
        coverageCurrentIndex,
        coveragePreviousIndex,
      ] = indexes;
      const categoricalFields = new Map(categorical.map(({ field, index }) => [index, field]));
      const seen = new Set<number>();
      const categoricalMeasurements: ActivityFieldMeasurement[] = [];
      for (const row of rawResponse.values) {
        const fieldId = row[fieldIndex];
        const field = typeof fieldId === 'number' ? categoricalFields.get(fieldId) : undefined;
        const value = row[valueIndex];
        const observed = row[currentIndex];
        const previous = row[previousIndex];
        const observedCoverage = row[coverageCurrentIndex];
        const previousCoverage = row[coveragePreviousIndex];
        if (
          typeof fieldId !== 'number' ||
          !field ||
          seen.has(fieldId) ||
          (value !== null && typeof value !== 'string') ||
          (field.type === 'boolean' && value !== null && value !== 'true' && value !== 'false') ||
          typeof observed !== 'number' ||
          !Number.isSafeInteger(observed) ||
          observed < 0 ||
          observed > currentTotal ||
          typeof previous !== 'number' ||
          !Number.isSafeInteger(previous) ||
          previous < 0 ||
          previous > previousTotal ||
          typeof observedCoverage !== 'number' ||
          !Number.isSafeInteger(observedCoverage) ||
          observedCoverage < currentTotal ||
          typeof previousCoverage !== 'number' ||
          !Number.isSafeInteger(previousCoverage) ||
          previousCoverage < previousTotal
        ) {
          return { measurements, complete: false };
        }
        seen.add(fieldId);
        categoricalMeasurements.push({
          field,
          value: value === null ? null : field.type === 'boolean' ? value === 'true' : value,
          observed,
          previous,
        });
      }
      measurements.push(...categoricalMeasurements);
    } catch {
      signal.throwIfAborted();
      complete = false;
    }
  }
  return { measurements, complete };
};
