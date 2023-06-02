/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimeBuckets, TimeRange, UI_SETTINGS } from '@kbn/data-plugin/common';
import { Datatable, DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import { omit, pick } from 'lodash';
import dateMath from '@kbn/datemath';
import moment from 'moment';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import {
  ManualEventAnnotationOutput,
  ManualPointEventAnnotationOutput,
  ManualRangeEventAnnotationOutput,
} from '../manual_event_annotation/types';
import { QueryPointEventAnnotationOutput } from '../query_point_event_annotation/types';
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

function toAbsoluteDate(date: string) {
  const parsed = dateMath.parse(date);
  return parsed ? parsed.toDate() : undefined;
}

export function toAbsoluteDates(range: TimeRange) {
  const fromDate = dateMath.parse(range.from);
  const toDate = dateMath.parse(range.to, { roundUp: true });

  if (!fromDate || !toDate) {
    return;
  }

  return {
    from: fromDate.toDate(),
    to: toDate.toDate(),
  };
}

export const getCalculatedInterval = (
  uiSettings: IUiSettingsClient,
  usedInterval: string,
  timeRange?: TimeRange
) => {
  const dates = timeRange && toAbsoluteDates(timeRange);
  if (!dates) {
    return;
  }
  const buckets = new TimeBuckets({
    'histogram:maxBars': uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS),
    'histogram:barTarget': uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
    dateFormat: uiSettings.get('dateFormat'),
    'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
  });

  buckets.setInterval(usedInterval);
  buckets.setBounds({
    min: moment(dates.from),
    max: moment(dates.to),
  });

  return buckets.getInterval().expression;
};

export const isInRange = (annotation: ManualEventAnnotationOutput, timerange?: TimeRange) => {
  if (!timerange) {
    return false;
  }
  const { from, to } = toAbsoluteDates(timerange) || {};
  if (!from || !to) {
    return false;
  }
  if (isRangeAnnotation(annotation)) {
    const time = toAbsoluteDate(annotation.time);
    const endTime = toAbsoluteDate(annotation.endTime);
    if (time && endTime) {
      return !(time >= to || endTime < from);
    }
  }
  if (isManualPointAnnotation(annotation)) {
    const time = toAbsoluteDate(annotation.time);
    if (time) {
      return time >= from && time <= to;
    }
  }
  return true;
};

export const sortByTime = (a: DatatableRow, b: DatatableRow) => {
  return 'time' in a && 'time' in b ? a.time.localeCompare(b.time) : 0;
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
  queryAnnotationConfigs: QueryPointEventAnnotationOutput[],
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
            name: swappedFieldsColIdMap[col.id], // we need to overwrite the name because esaggs column name is per bucket and not per row (eg. "First 10 fields...")
            id: `field:${swappedFieldsColIdMap[col.id]}`,
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

  const modifiedRows = esaggsResponses
    .flatMap(({ response, fieldsColIdMap }) =>
      response.rows.map((row) => {
        const annotationConfig = queryAnnotationConfigs.find(({ id }) => id === row['col-0-1']);
        if (!annotationConfig) {
          throw new Error(`Could not find annotation config for id: ${row['col-0-1']}`);
        }

        let extraFields: Record<string, string | number | string[] | number[]> = {};
        if (annotationConfig?.extraFields?.length) {
          extraFields = annotationConfig.extraFields.reduce((acc, field) => {
            acc[`field:${field}`] = row[fieldsColIdMap[field]];
            return acc;
          }, {} as typeof extraFields);
        }
        if (annotationConfig?.textField) {
          extraFields[`field:${annotationConfig.textField}`] =
            row[fieldsColIdMap[annotationConfig.textField]];
        }

        let modifiedRow: TimebucketRow = {
          ...passStylesFromAnnotationConfig(annotationConfig),
          id: row['col-0-1'],
          timebucket: moment(row['col-1-2']).toISOString(),
          time: row['col-3-4'],
          type: 'point',
          label: annotationConfig.label,
          extraFields,
        };
        const countRow = row['col-2-3'];
        if (countRow > ANNOTATIONS_PER_BUCKET) {
          modifiedRow = {
            skippedCount: countRow - ANNOTATIONS_PER_BUCKET,
            ...modifiedRow,
          };
        }

        return modifiedRow;
      })
    )
    .concat(...manualAnnotationDatatableRows)
    .sort((a, b) => a.timebucket.localeCompare(b.timebucket));

  const skippedCountPerBucket = getSkippedCountPerBucket(modifiedRows);

  const flattenedRows = modifiedRows
    .reduce<DatatableRow[]>((acc, row) => {
      if (!Array.isArray(row.time)) {
        acc.push({
          ...omit(row, ['extraFields', 'skippedCount']),
          ...row.extraFields,
        });
      } else {
        row.time.forEach((time, index) => {
          const extraFields: Record<string, string | number | boolean> = {};
          if (row.extraFields) {
            Object.entries(row?.extraFields).forEach(([fieldKey, fieldValue]) => {
              extraFields[fieldKey] = Array.isArray(fieldValue) ? fieldValue[index] : fieldValue;
            });
          }

          acc.push({
            ...omit(row, ['extraFields', 'skippedCount']),
            ...extraFields,
            label: Array.isArray(row.label) ? row.label[index] : row.label,
            time,
          });
        });
      }
      return acc;
    }, [])
    .sort(sortByTime)
    .reduce<DatatableRow[]>((acc, row, index, arr) => {
      if (index === arr.length - 1 || row.timebucket !== arr[index + 1].timebucket) {
        acc.push({ ...row, skippedCount: skippedCountPerBucket[row.timebucket] });
        return acc;
      }
      acc.push(row);
      return acc;
    }, []);

  return wrapRowsInDatatable(flattenedRows, datatableColumns);
};

type TimebucketRow = {
  id: string;
  timebucket: string;
  time: string;
  type: string;
  skippedCount?: number;
  extraFields?: Record<string, string | number | string[] | number[]>;
} & PointStyleProps;

function getSkippedCountPerBucket(rows: TimebucketRow[]) {
  return rows.reduce<Record<string, number>>((acc, current) => {
    if (current.skippedCount) {
      acc[current.timebucket] = (acc[current.timebucket] || 0) + current.skippedCount;
    }
    return acc;
  }, {});
}

function passStylesFromAnnotationConfig(
  annotationConfig: QueryPointEventAnnotationOutput
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
