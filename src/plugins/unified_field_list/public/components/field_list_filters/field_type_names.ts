/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { type FieldTypeForFilter } from '../../types';

export const FIELD_TYPE_NAMES: Record<FieldTypeForFilter, string> = {
  document: i18n.translate('unifiedFieldList.fieldFilterType.record', { defaultMessage: 'Record' }),
  string: i18n.translate('unifiedFieldList.fieldFilterType.string', {
    defaultMessage: 'Text string',
  }),
  number: i18n.translate('unifiedFieldList.fieldFilterType.number', { defaultMessage: 'Number' }),
  gauge: i18n.translate('unifiedFieldList.fieldFilterType.gauge', {
    defaultMessage: 'Gauge metric',
  }),
  counter: i18n.translate('unifiedFieldList.fieldFilterType.counter', {
    defaultMessage: 'Counter metric',
  }),
  boolean: i18n.translate('unifiedFieldList.fieldFilterType.boolean', {
    defaultMessage: 'Boolean',
  }),
  date: i18n.translate('unifiedFieldList.fieldFilterType.date', { defaultMessage: 'Date' }),
  ip: i18n.translate('unifiedFieldList.fieldFilterType.ipAddress', {
    defaultMessage: 'IP address',
  }),
  histogram: i18n.translate('unifiedFieldList.fieldFilterType.histogram', {
    defaultMessage: 'Histogram',
  }),
  geo_point: i18n.translate('unifiedFieldList.fieldFilterType.geoPoint', {
    defaultMessage: 'Geographic point',
  }),
  geo_shape: i18n.translate('unifiedFieldList.fieldFilterType.geoShape', {
    defaultMessage: 'Geographic shape',
  }),
  murmur3: i18n.translate('unifiedFieldList.fieldFilterType.murmur3', {
    defaultMessage: 'murmur3',
  }),
};
