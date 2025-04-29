/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';

export function canProvideStatsForField(field: DataViewField, isEsqlQuery: boolean): boolean {
  if (isEsqlQuery) {
    return false;
  }
  return (
    (field.aggregatable && canProvideAggregatedStatsForField(field, isEsqlQuery)) ||
    ((!field.aggregatable || field.type === 'geo_point' || field.type === 'geo_shape') &&
      canProvideExamplesForField(field, isEsqlQuery))
  );
}

export function canProvideAggregatedStatsForField(
  field: DataViewField,
  isEsqlQuery: boolean
): boolean {
  if (isEsqlQuery) {
    return false;
  }
  return !(
    field.type === 'document' ||
    field.type.includes('range') ||
    field.type === 'geo_point' ||
    field.type === 'geo_shape' ||
    field.type === 'murmur3' ||
    field.type === 'attachment'
  );
}

export function canProvideNumberSummaryForField(
  field: DataViewField,
  isEsqlQuery: boolean
): boolean {
  if (isEsqlQuery) {
    return false;
  }
  return field.timeSeriesMetric === 'counter';
}

export function canProvideExamplesForField(field: DataViewField, isEsqlQuery: boolean): boolean {
  if (isEsqlQuery) {
    return false;
  }
  if (field.name === '_score') {
    return false;
  }
  return [
    'string',
    'text',
    'keyword',
    'version',
    'ip',
    'number',
    'geo_point',
    'geo_shape',
  ].includes(field.type);
}

export function canProvideStatsForEsqlField(field: DataViewField): boolean {
  return false;
}
