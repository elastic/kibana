/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { KBN_FIELD_TYPES, ES_FIELD_TYPES } from '@kbn/data-plugin/public';

export const KNOWN_FIELD_TYPES = {
  BOOLEAN: KBN_FIELD_TYPES.BOOLEAN,
  CONFLICT: KBN_FIELD_TYPES.CONFLICT,
  DATE: KBN_FIELD_TYPES.DATE,
  GEO_POINT: KBN_FIELD_TYPES.GEO_POINT,
  GEO_SHAPE: KBN_FIELD_TYPES.GEO_SHAPE,
  IP: KBN_FIELD_TYPES.IP,
  KEYWORD: ES_FIELD_TYPES.KEYWORD,
  MURMUR3: KBN_FIELD_TYPES.MURMUR3,
  NUMBER: KBN_FIELD_TYPES.NUMBER,
  NESTED: KBN_FIELD_TYPES.NESTED,
  SOURCE: 'source',
  STRING: KBN_FIELD_TYPES.STRING,
  TEXT: ES_FIELD_TYPES.TEXT,
  VERSION: ES_FIELD_TYPES.VERSION,
};

export const UNKNOWN_FIELD_TYPE_MESSAGE = 'Unknown field';

export function getFieldTypeName(type?: string) {
  switch (type) {
    case KNOWN_FIELD_TYPES.BOOLEAN:
      return i18n.translate('discover.fieldNameIcons.booleanAriaLabel', {
        defaultMessage: 'Boolean field',
      });
    case KNOWN_FIELD_TYPES.CONFLICT:
      return i18n.translate('discover.fieldNameIcons.conflictFieldAriaLabel', {
        defaultMessage: 'Conflicting field',
      });
    case KNOWN_FIELD_TYPES.DATE:
      return i18n.translate('discover.fieldNameIcons.dateFieldAriaLabel', {
        defaultMessage: 'Date field',
      });
    case KNOWN_FIELD_TYPES.GEO_POINT:
      return i18n.translate('discover.fieldNameIcons.geoPointFieldAriaLabel', {
        defaultMessage: 'Geo point field',
      });
    case KNOWN_FIELD_TYPES.GEO_SHAPE:
      return i18n.translate('discover.fieldNameIcons.geoShapeFieldAriaLabel', {
        defaultMessage: 'Geo shape field',
      });
    case KNOWN_FIELD_TYPES.IP:
      return i18n.translate('discover.fieldNameIcons.ipAddressFieldAriaLabel', {
        defaultMessage: 'IP address field',
      });
    case KNOWN_FIELD_TYPES.MURMUR3:
      return i18n.translate('discover.fieldNameIcons.murmur3FieldAriaLabel', {
        defaultMessage: 'Murmur3 field',
      });
    case KNOWN_FIELD_TYPES.NUMBER:
      return i18n.translate('discover.fieldNameIcons.numberFieldAriaLabel', {
        defaultMessage: 'Number field',
      });
    case KNOWN_FIELD_TYPES.SOURCE:
      // Note that this type is currently not provided, type for _source is undefined
      return i18n.translate('discover.fieldNameIcons.sourceFieldAriaLabel', {
        defaultMessage: 'Source field',
      });
    case KNOWN_FIELD_TYPES.STRING:
      return i18n.translate('discover.fieldNameIcons.stringFieldAriaLabel', {
        defaultMessage: 'String field',
      });
    case KNOWN_FIELD_TYPES.TEXT:
      return i18n.translate('discover.fieldNameIcons.textFieldAriaLabel', {
        defaultMessage: 'Text field',
      });
    case KNOWN_FIELD_TYPES.KEYWORD:
      return i18n.translate('discover.fieldNameIcons.keywordFieldAriaLabel', {
        defaultMessage: 'Keyword field',
      });
    case KNOWN_FIELD_TYPES.NESTED:
      return i18n.translate('discover.fieldNameIcons.nestedFieldAriaLabel', {
        defaultMessage: 'Nested field',
      });
    case KNOWN_FIELD_TYPES.VERSION:
      return i18n.translate('discover.fieldNameIcons.versionFieldAriaLabel', {
        defaultMessage: 'Version field',
      });
    default:
      return i18n.translate('discover.fieldNameIcons.unknownFieldAriaLabel', {
        defaultMessage: UNKNOWN_FIELD_TYPE_MESSAGE,
      });
  }
}
