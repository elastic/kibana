/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';

export function canProvideStatsForField(field: DataViewField, isTextBased: boolean): boolean {
  if (isTextBased) {
    return canProvideStatsForFieldTextBased(field);
  }
  return (
    (field.aggregatable && canProvideAggregatedStatsForField(field, isTextBased)) ||
    ((!field.aggregatable || field.type === 'geo_point' || field.type === 'geo_shape') &&
      canProvideExamplesForField(field, isTextBased))
  );
}

export function canProvideAggregatedStatsForField(
  field: DataViewField,
  isTextBased: boolean
): boolean {
  if (isTextBased) {
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
  isTextBased: boolean
): boolean {
  if (isTextBased) {
    return false;
  }
  return field.timeSeriesMetric === 'counter';
}

export function canProvideExamplesForField(field: DataViewField, isTextBased: boolean): boolean {
  if (isTextBased) {
    return (
      (field.type === 'string' && !canProvideTopValuesForFieldTextBased(field)) ||
      ['geo_point', 'geo_shape'].includes(field.type)
    );
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

export function canProvideTopValuesForFieldTextBased(field: DataViewField): boolean {
  if (field.name === '_id') {
    return false;
  }
  const esTypes = field.esTypes?.[0];
  return (
    Boolean(field.type === 'string' && esTypes && ['keyword', 'version'].includes(esTypes)) ||
    ['keyword', 'version', 'ip', 'number', 'boolean'].includes(field.type)
  );
}

export function canProvideStatsForFieldTextBased(field: DataViewField): boolean {
  return canProvideTopValuesForFieldTextBased(field) || canProvideExamplesForField(field, true);
}
