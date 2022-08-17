/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimeRange } from '@kbn/data-plugin/common';
import { Datatable, DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import { omit, pick } from 'lodash';
import moment from 'moment';
import {
  ManualEventAnnotationOutput,
  ManualPointEventAnnotationOutput,
  ManualRangeEventAnnotationOutput,
} from '../manual_event_annotation/types';
import { QueryEventAnnotationOutput } from '../query_event_annotation/types';
import {
  annotationColumns,
  AvailableAnnotationIcon,
  EventAnnotationOutput,
  LineStyle,
  PointStyleProps,
} from '../types';

export const isRangeAnnotation = (
  annotation: EventAnnotationOutput
): annotation is ManualRangeEventAnnotationOutput => {
  return 'endTime' in annotation;
};

export const isManualPointAnnotation = (
  annotation: EventAnnotationOutput
): annotation is ManualPointEventAnnotationOutput => {
  return 'time' in annotation && !('endTime' in annotation);
};

export const isManualAnnotation = (
  annotation: EventAnnotationOutput
): annotation is ManualPointEventAnnotationOutput | ManualRangeEventAnnotationOutput =>
  isRangeAnnotation(annotation) || isManualPointAnnotation(annotation);

export const isInRange = (annotation: ManualEventAnnotationOutput, timerange?: TimeRange) => {
  if (!timerange) {
    return false;
  }
  if (isRangeAnnotation(annotation)) {
    return !(annotation.time >= timerange.to || annotation.endTime < timerange.from);
  }
  if (isManualPointAnnotation(annotation)) {
    return annotation.time >= timerange.from && annotation.time <= timerange.to;
  }
  return true;
};

export const sortByTime = (a: { time: string }, b: { time: string }) => {
  return a.time.localeCompare(b.time);
};

export const wrapRowsInDatatable = (rows: DatatableRow[], columns = annotationColumns) => {
  const datatable: Datatable = {
    type: 'datatable',
    columns,
    rows,
  };
  return datatable;
};

export const ANNOTATIONS_PER_BUCKET = 10;

export const postprocessAnnotations = (
  esaggsResponses: Array<{
    response: Datatable;
    fieldsColIdMap: Record<string, string>;
  }>,
  queryAnnotationConfigs: QueryEventAnnotationOutput[],
  manualAnnotationDatatableRows: Array<{
    type: string;
    id: string;
    time: string;
    label: string;
    color?: string | undefined;
    icon?: AvailableAnnotationIcon | undefined;
    lineWidth?: number | undefined;
    lineStyle?: LineStyle | undefined;
    textVisibility?: boolean | undefined;
    isHidden?: boolean | undefined;
    timebucket: string;
  }> // todo: simplify types
) => {
  const datatableColumns: DatatableColumn[] = esaggsResponses
    .flatMap(({ response, fieldsColIdMap }) => {
      const swappedFieldsColIdMap = Object.fromEntries(
        Object.entries(fieldsColIdMap).map(([k, v]) => [v, k])
      );
      return response.columns
        .filter((col) => swappedFieldsColIdMap[col.id])
        .map((col) => {
          return {
            ...col,
            id: swappedFieldsColIdMap[col.id],
          };
        });
    })
    .reduce<DatatableColumn[]>((acc, col) => {
      if (!acc.find((c) => c.id === col.id)) {
        acc.push(col);
      }
      return acc;
    }, [])
    .concat(annotationColumns);

  let modifiedRows = esaggsResponses
    .flatMap(({ response, fieldsColIdMap }) =>
      response.rows
        .map((row) => {
          const annotationConfig = queryAnnotationConfigs.find(({ id }) => id === row['col-0-1']);
          if (!annotationConfig) {
            throw new Error(`Could not find annotation config for id: ${row['col-0-1']}`);
          }

          const modifiedRow: TimebucketRow = {
            id: row['col-0-1'], // todo: do we need id for the tooltip in the future?
            timebucket: moment(row['col-1-2']).toISOString(),
            time: row['col-3-4'],
            type: 'point',
            ...passStylesFromAnnotationConfig(annotationConfig),
          };
          const countRow = row['col-2-3'];
          if (countRow > ANNOTATIONS_PER_BUCKET) {
            modifiedRow.skippedCount = countRow - ANNOTATIONS_PER_BUCKET;
          }

          if (annotationConfig?.fields?.length) {
            modifiedRow.fields = annotationConfig.fields.reduce(
              (acc, field) => ({ ...acc, [`field:${field}`]: row[fieldsColIdMap[field]] }),
              {}
            );
          }

          return modifiedRow;
        })
        .concat(manualAnnotationDatatableRows)
    )
    .sort((a, b) => a.timebucket.localeCompare(b.timebucket));

  modifiedRows = addSkippedCount(modifiedRows);

  const flattenedRows = modifiedRows
    .reduce<any>((acc, row) => {
      if (!Array.isArray(row.time)) {
        acc.push({
          ...omit(row, ['fields']),
          ...row.fields,
        });
      } else {
        row.time.forEach((time, index, array) => {
          const fields: Record<string, string | number | boolean> = {};
          if (row.fields) {
            Object.entries(row?.fields).forEach(([fieldKey, fieldValue]) => {
              fields[fieldKey] = Array.isArray(fieldValue) ? fieldValue[index] : fieldValue;
            });
          }
          acc.push({
            ...(index === array.length - 1 && row.skippedCount
              ? { skippedCount: row.skippedCount }
              : null),
            ...omit(row, ['fields', 'skippedCount']),
            ...fields,
            time,
          });
        });
      }
      return acc;
    }, [])
    .sort(sortByTime);

  return wrapRowsInDatatable(flattenedRows, datatableColumns);
};

function passStylesFromAnnotationConfig(
  annotationConfig: QueryEventAnnotationOutput
): PointStyleProps {
  return {
    ...pick(annotationConfig, [
      `label`,
      `color`,
      `icon`,
      `lineWidth`,
      `lineStyle`,
      `textVisibility`,
    ]),
  };
}

type TimebucketRow = {
  id: string;
  timebucket: string;
  time: string;
  type: string;
  skippedCount?: number;
  fields?: Record<string, string | number | string[] | number[]>;
} & PointStyleProps;

function addSkippedCount(rows: TimebucketRow[]) {
  let accSkippedCount = 0;
  const output: TimebucketRow[] = [];

  rows.forEach((row, index, arr) => {
    const noSkippedCountRow = omit(row, 'skippedCount');
    if (index === arr.length - 1 || row.timebucket !== arr[index + 1].timebucket) {
      if (accSkippedCount > 0) {
        output.push({
          skippedCount: accSkippedCount,
          ...noSkippedCountRow,
        });
      } else {
        output.push(noSkippedCountRow);
      }
      accSkippedCount = 0;
    } else {
      output.push(noSkippedCountRow);
      accSkippedCount = accSkippedCount + Number(row.skippedCount);
    }
  });
  return output;
}
