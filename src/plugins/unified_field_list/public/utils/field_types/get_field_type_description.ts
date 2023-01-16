/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { KNOWN_FIELD_TYPES } from './field_types';

/**
 * A user-friendly description of an unknown field type
 */
export const UNKNOWN_FIELD_TYPE_DESC = i18n.translate(
  'unifiedFieldList.fieldNameDescription.unknownField',
  {
    defaultMessage: 'Unknown field',
  }
);

/**
 * Returns a user-friendly description of a field type
 * @param type
 * @public
 */
export function getFieldTypeDescription(type?: string) {
  if (!type || type === KBN_FIELD_TYPES.UNKNOWN) {
    return UNKNOWN_FIELD_TYPE_DESC;
  }

  const knownType: KNOWN_FIELD_TYPES = type as KNOWN_FIELD_TYPES;
  switch (knownType) {
    case KNOWN_FIELD_TYPES.DOCUMENT:
      return i18n.translate('unifiedFieldList.fieldNameDescription.recordField', {
        defaultMessage: 'Number of records.', // TODO: add a better description
      });
    case KNOWN_FIELD_TYPES.BOOLEAN:
      return i18n.translate('unifiedFieldList.fieldNameDescription.booleanField', {
        defaultMessage: 'True and false values.',
      });
    case KNOWN_FIELD_TYPES.CONFLICT:
      return i18n.translate('unifiedFieldList.fieldNameDescription.conflictField', {
        defaultMessage: 'Field has values of different types. Resolve in Management > Data Views.',
      });
    case KNOWN_FIELD_TYPES.COUNTER:
      return i18n.translate('unifiedFieldList.fieldNameDescription.counterField', {
        defaultMessage: 'Counter metric.', // TODO: add a better description
      });
    case KNOWN_FIELD_TYPES.DATE:
      return i18n.translate('unifiedFieldList.fieldNameDescription.dateField', {
        defaultMessage: 'A date string or the number of seconds or milliseconds since 1/1/1970.',
      });
    case KNOWN_FIELD_TYPES.DATE_RANGE:
      return i18n.translate('unifiedFieldList.fieldNameDescription.dateRangeField', {
        defaultMessage: 'Range of date values.',
      });
    case KNOWN_FIELD_TYPES.GAUGE:
      return i18n.translate('unifiedFieldList.fieldNameDescription.gaugeField', {
        defaultMessage: 'Gauge metric.', // TODO: add a better description
      });
    case KNOWN_FIELD_TYPES.GEO_POINT:
      return i18n.translate('unifiedFieldList.fieldNameDescription.geoPointField', {
        defaultMessage: 'Latitude and longitude points.',
      });
    case KNOWN_FIELD_TYPES.GEO_SHAPE:
      return i18n.translate('unifiedFieldList.fieldNameDescription.geoShapeField', {
        defaultMessage: 'Complex shapes, such as polygons.',
      });
    case KNOWN_FIELD_TYPES.HISTOGRAM:
      return i18n.translate('unifiedFieldList.fieldNameDescription.histogramField', {
        defaultMessage: 'Pre-aggregated numerical values in the form of a histogram.',
      });
    case KNOWN_FIELD_TYPES.IP:
      return i18n.translate('unifiedFieldList.fieldNameDescription.ipAddressField', {
        defaultMessage: 'IPv4 and IPv6 addresses.',
      });
    case KNOWN_FIELD_TYPES.IP_RANGE:
      return i18n.translate('unifiedFieldList.fieldNameDescription.ipAddressRangeField', {
        defaultMessage: 'Range of ip values supporting either IPv4 or IPv6 (or mixed) addresses.',
      });
    case KNOWN_FIELD_TYPES.MURMUR3:
      return i18n.translate('unifiedFieldList.fieldNameDescription.murmur3Field', {
        defaultMessage: 'Field that computes and stores hashes of values.',
      });
    case KNOWN_FIELD_TYPES.NUMBER:
      return i18n.translate('unifiedFieldList.fieldNameDescription.numberField', {
        defaultMessage: 'Long, integer, short, byte, double, and float values.',
      });
    case KNOWN_FIELD_TYPES.STRING:
      return i18n.translate('unifiedFieldList.fieldNameDescription.stringField', {
        defaultMessage: 'Full text such as the body of an email or a product description.',
      });
    case KNOWN_FIELD_TYPES.TEXT:
      return i18n.translate('unifiedFieldList.fieldNameDescription.textField', {
        defaultMessage: 'Full text such as the body of an email or a product description.',
      });
    case KNOWN_FIELD_TYPES.KEYWORD:
      return i18n.translate('unifiedFieldList.fieldNameDescription.keywordField', {
        defaultMessage:
          'Structured content such as an ID, email address, hostname, status code, or tag.',
      });
    case KNOWN_FIELD_TYPES.NESTED:
      return i18n.translate('unifiedFieldList.fieldNameDescription.nestedField', {
        defaultMessage: 'JSON object that preserves the relationship between its subfields.',
      });
    case KNOWN_FIELD_TYPES.VERSION:
      return i18n.translate('unifiedFieldList.fieldNameDescription.versionField', {
        defaultMessage: 'Software versions. Supports "Semantic Versioning" precedence rules.',
      });
    default:
      // If you see a typescript error here, that's a sign that there are missing switch cases ^^
      const _exhaustiveCheck: never = knownType;
      return knownType || _exhaustiveCheck;
  }
}
