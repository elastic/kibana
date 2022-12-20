/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import { KNOWN_FIELD_TYPES } from './field_types';

/**
 * A user-friendly name of an unknown field type
 */
export const UNKNOWN_FIELD_TYPE_MESSAGE = i18n.translate(
  'unifiedFieldList.fieldNameIcons.unknownFieldAriaLabel',
  {
    defaultMessage: 'Unknown field',
  }
);

/**
 * Returns a user-friendly name of a field type
 * @param type
 * @public
 */
export function getFieldTypeName(type?: string) {
  if (!type || type === KBN_FIELD_TYPES.UNKNOWN) {
    return UNKNOWN_FIELD_TYPE_MESSAGE;
  }

  if (type === 'source') {
    // Note that this type is currently not provided, type for _source is undefined
    return i18n.translate('unifiedFieldList.fieldNameIcons.sourceFieldAriaLabel', {
      defaultMessage: 'Source field',
    });
  }

  const knownType: KNOWN_FIELD_TYPES = type as KNOWN_FIELD_TYPES;
  switch (knownType) {
    case KNOWN_FIELD_TYPES.DOCUMENT:
      return i18n.translate('unifiedFieldList.fieldNameIcons.recordAriaLabel', {
        defaultMessage: 'Records', // TODO: check if we need to rename it
      });
    case KNOWN_FIELD_TYPES.BOOLEAN:
      return i18n.translate('unifiedFieldList.fieldNameIcons.booleanAriaLabel', {
        defaultMessage: 'Boolean',
      });
    case KNOWN_FIELD_TYPES.CONFLICT:
      return i18n.translate('unifiedFieldList.fieldNameIcons.conflictFieldAriaLabel', {
        defaultMessage: 'Conflict',
      });
    case KNOWN_FIELD_TYPES.COUNTER:
      return i18n.translate('unifiedFieldList.fieldNameIcons.counterFieldAriaLabel', {
        defaultMessage: 'Counter metric',
      });
    case KNOWN_FIELD_TYPES.DATE:
      return i18n.translate('unifiedFieldList.fieldNameIcons.dateFieldAriaLabel', {
        defaultMessage: 'Date',
      });
    case KNOWN_FIELD_TYPES.DATE_RANGE:
      return i18n.translate('unifiedFieldList.fieldNameIcons.dateRangeFieldAriaLabel', {
        defaultMessage: 'Date range',
      });
    case KNOWN_FIELD_TYPES.GAUGE:
      return i18n.translate('unifiedFieldList.fieldNameIcons.gaugeFieldAriaLabel', {
        defaultMessage: 'Gauge metric',
      });
    case KNOWN_FIELD_TYPES.GEO_POINT:
      return i18n.translate('unifiedFieldList.fieldNameIcons.geoPointFieldAriaLabel', {
        defaultMessage: 'Geo point',
      });
    case KNOWN_FIELD_TYPES.GEO_SHAPE:
      return i18n.translate('unifiedFieldList.fieldNameIcons.geoShapeFieldAriaLabel', {
        defaultMessage: 'Geo shape',
      });
    case KNOWN_FIELD_TYPES.HISTOGRAM:
      return i18n.translate('unifiedFieldList.fieldNameIcons.histogramFieldAriaLabel', {
        defaultMessage: 'Histogram',
      });
    case KNOWN_FIELD_TYPES.IP:
      return i18n.translate('unifiedFieldList.fieldNameIcons.ipAddressFieldAriaLabel', {
        defaultMessage: 'IP address',
      });
    case KNOWN_FIELD_TYPES.IP_RANGE:
      return i18n.translate('unifiedFieldList.fieldNameIcons.ipRangeFieldAriaLabel', {
        defaultMessage: 'IP range',
      });
    case KNOWN_FIELD_TYPES.MURMUR3:
      return i18n.translate('unifiedFieldList.fieldNameIcons.murmur3FieldAriaLabel', {
        defaultMessage: 'Murmur3',
      });
    case KNOWN_FIELD_TYPES.NUMBER:
      return i18n.translate('unifiedFieldList.fieldNameIcons.numberFieldAriaLabel', {
        defaultMessage: 'Number',
      });
    case KNOWN_FIELD_TYPES.STRING:
      return i18n.translate('unifiedFieldList.fieldNameIcons.stringFieldAriaLabel', {
        defaultMessage: 'String',
      });
    case KNOWN_FIELD_TYPES.TEXT:
      return i18n.translate('unifiedFieldList.fieldNameIcons.textFieldAriaLabel', {
        defaultMessage: 'Text',
      });
    case KNOWN_FIELD_TYPES.KEYWORD:
      return i18n.translate('unifiedFieldList.fieldNameIcons.keywordFieldAriaLabel', {
        defaultMessage: 'Keyword',
      });
    case KNOWN_FIELD_TYPES.NESTED:
      return i18n.translate('unifiedFieldList.fieldNameIcons.nestedFieldAriaLabel', {
        defaultMessage: 'Nested',
      });
    case KNOWN_FIELD_TYPES.VERSION:
      return i18n.translate('unifiedFieldList.fieldNameIcons.versionFieldAriaLabel', {
        defaultMessage: 'Version',
      });
    default:
      // If you see a typescript error here, that's a sign that there are missing switch cases ^^
      const _exhaustiveCheck: never = knownType;
      return knownType || _exhaustiveCheck;
  }
}
