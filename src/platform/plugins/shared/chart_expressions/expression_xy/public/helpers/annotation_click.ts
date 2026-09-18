/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { snakeCase } from 'lodash';
import type { LineAnnotationEvent, RectAnnotationEvent } from '@elastic/charts';
import type { AnnotationClickDatum } from '@kbn/charts-plugin/public';
import type {
  ManualRangeEventAnnotationRow,
  PointEventAnnotationRow,
} from '@kbn/event-annotation-plugin/common';
import type { MergedAnnotation } from '../../common';

const EXTRA_FIELD_PREFIX = 'field:';

export const getLineAnnotationChartId = (configId: string, time: string): string =>
  snakeCase(`${configId}-${time}`);

export const toAnnotationClickDatum = (
  row: PointEventAnnotationRow | ManualRangeEventAnnotationRow,
  isGrouped?: boolean
): AnnotationClickDatum => {
  const extras: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key.startsWith(EXTRA_FIELD_PREFIX)) {
      extras[key.slice(EXTRA_FIELD_PREFIX.length)] = value;
    }
  }

  return {
    id: row.id,
    type: row.type,
    time: row.time,
    label: row.label,
    ...('endTime' in row ? { endTime: row.endTime } : {}),
    ...(isGrouped ? { isGrouped: true } : {}),
    ...(Object.keys(extras).length > 0 ? { extras } : {}),
  };
};

export const mapAnnotationClickEvents = ({
  lines,
  rects,
  groupedLineAnnotations,
  rangeAnnotations,
}: {
  lines: LineAnnotationEvent[];
  rects: RectAnnotationEvent[];
  groupedLineAnnotations: MergedAnnotation[];
  rangeAnnotations: ManualRangeEventAnnotationRow[];
}): AnnotationClickDatum[] => {
  const clicked: AnnotationClickDatum[] = [];

  for (const line of lines) {
    const grouped = groupedLineAnnotations.find(
      (annotation) => getLineAnnotationChartId(annotation.id, annotation.time) === line.id
    );
    if (!grouped) {
      continue;
    }
    for (const row of grouped.rows) {
      clicked.push(toAnnotationClickDatum(row, grouped.isGrouped));
    }
  }

  for (const rect of rects) {
    const range = rangeAnnotations.find((annotation) => annotation.id === rect.id);
    if (range) {
      clicked.push(toAnnotationClickDatum(range));
    }
  }

  return clicked;
};
