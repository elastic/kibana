/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { roundDateToESInterval } from '@elastic/charts';
import type { ESCalendarInterval, ESFixedInterval } from '@elastic/charts';
import { parseEsInterval } from '@kbn/data-plugin/common';
import type { TimeRange } from '@kbn/data-plugin/common';
import type { Datatable, DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import type { EsqlEventAnnotationOutput } from '../esql_event_annotation';
import { annotationColumns } from '../types';
import { ANNOTATIONS_PER_BUCKET, sortByTime, toAbsoluteDates, wrapRowsInDatatable } from './utils';

export const toEsqlAnnotationDatatable = ({
  annotation,
  datatable,
  interval,
  timezone,
  timeRange,
}: {
  annotation: EsqlEventAnnotationOutput;
  datatable: Datatable;
  interval: string;
  timezone: string;
  timeRange: TimeRange;
}): Datatable => {
  // Column problems are configuration errors and fail the chart, like missing fields on DSL
  // query annotations. Row problems are skipped, like documents without the time field.
  const findColumn = (name: string, dateOnly = false): DatatableColumn => {
    const column = datatable.columns.find((candidate) => candidate.name === name);
    if (!column || (dateOnly && column.meta.type !== 'date')) {
      throw new Error(
        i18n.translate('eventAnnotation.esqlAnnotation.invalidColumnErrorMessage', {
          defaultMessage:
            'Annotation {label}: column {column} is missing or has an incompatible type.',
          values: { label: annotation.label, column: name },
        })
      );
    }
    return column;
  };
  const timeColumn = findColumn(annotation.timeColumn, true);
  const endTimeColumn = annotation.endTimeColumn
    ? findColumn(annotation.endTimeColumn, true)
    : undefined;
  const extraNames = new Set([
    ...(annotation.extraColumns ?? []),
    ...(annotation.textColumn ? [annotation.textColumn] : []),
  ]);
  const extraColumns = [...extraNames].map((name) => findColumn(name));
  // Independent queries may reuse aliases with different types and formatters.
  const fieldId = (name: string) => JSON.stringify([annotation.id, name]);
  const bounds = toAbsoluteDates(timeRange);
  const rows: DatatableRow[] = [];

  for (const [index, row] of datatable.rows.entries()) {
    const startMs = parseTimestamp(row[timeColumn.id]);
    const endMs = endTimeColumn ? parseTimestamp(row[endTimeColumn.id]) : undefined;
    if (startMs === undefined || (endTimeColumn && (endMs === undefined || endMs < startMs))) {
      continue;
    }
    const time = moment(startMs).toISOString();
    const endTime = endMs === undefined ? undefined : moment(endMs).toISOString();
    if (
      bounds &&
      (moment(time).isAfter(bounds.to) || moment(endTime ?? time).isBefore(bounds.from))
    )
      continue;

    const timebucket = moment(
      roundDateToESInterval(
        moment(time).valueOf(),
        parseEsInterval(interval) as ESCalendarInterval | ESFixedInterval,
        'start',
        timezone
      )
    ).toISOString();
    rows.push({
      id: endTime ? `${annotation.id}:${index}` : annotation.id,
      type: endTime ? 'range' : 'point',
      time,
      ...(endTime
        ? { endTime, outside: annotation.outside }
        : {
            icon: annotation.icon,
            lineStyle: annotation.lineStyle,
            lineWidth: annotation.lineWidth,
            textVisibility: annotation.textVisibility,
          }),
      label: annotation.label,
      color: annotation.color,
      timebucket,
      ...(annotation.textColumn ? { textField: fieldId(annotation.textColumn) } : {}),
      ...Object.fromEntries(
        extraColumns.map((column) => [`field:${fieldId(column.name)}`, row[column.id]])
      ),
    });
  }

  const limitedRows: DatatableRow[] = [];
  const lastPointPerBucket = new Map<string, DatatableRow>();
  const countPerBucket = new Map<string, number>();
  for (const row of rows.sort(sortByTime)) {
    if (row.type === 'range') {
      limitedRows.push(row);
      continue;
    }
    const count = (countPerBucket.get(row.timebucket) ?? 0) + 1;
    countPerBucket.set(row.timebucket, count);
    if (count <= ANNOTATIONS_PER_BUCKET) {
      limitedRows.push(row);
      lastPointPerBucket.set(row.timebucket, row);
    } else {
      const lastPoint = lastPointPerBucket.get(row.timebucket);
      if (lastPoint) lastPoint.skippedCount = count - ANNOTATIONS_PER_BUCKET;
    }
  }

  return wrapRowsInDatatable(limitedRows, [
    ...annotationColumns,
    ...extraColumns.map((column) => ({ ...column, id: `field:${fieldId(column.name)}` })),
  ]);
};

const parseTimestamp = (value: unknown): number | undefined => {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  const date = typeof value === 'number' ? moment(value) : moment(value, moment.ISO_8601, true);
  return date.isValid() ? date.valueOf() : undefined;
};

export const mergeAnnotationDatatables = (tables: Datatable[]): Datatable => {
  const columns = new Map<string, DatatableColumn>();
  const skippedPerBucket = new Map<string, number>();
  for (const table of tables) {
    for (const column of table.columns) columns.set(column.id, column);
    for (const row of table.rows) {
      if (row.skippedCount)
        skippedPerBucket.set(
          row.timebucket,
          (skippedPerBucket.get(row.timebucket) ?? 0) + row.skippedCount
        );
    }
  }
  const rows = tables
    .flatMap((table) => table.rows.map(({ skippedCount, ...row }) => row))
    .sort(sortByTime);
  const lastPointPerBucket = new Map<string, DatatableRow>();
  for (const row of rows) {
    if (row.type === 'point') lastPointPerBucket.set(row.timebucket, row);
  }
  for (const [bucket, row] of lastPointPerBucket) {
    const skippedCount = skippedPerBucket.get(bucket);
    if (skippedCount) row.skippedCount = skippedCount;
  }
  return wrapRowsInDatatable(rows, [...columns.values()]);
};
