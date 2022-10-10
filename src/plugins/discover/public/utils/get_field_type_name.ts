/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import { KNOWN_FIELD_TYPES } from '../../common/field_types';

export const UNKNOWN_FIELD_TYPE_MESSAGE = i18n.translate(
  'discover.fieldNameIcons.unknownFieldAriaLabel',
  {
    defaultMessage: 'Unknown field',
  }
);

export function getFieldTypeName(type?: string) {
  if (!type || type === KBN_FIELD_TYPES.UNKNOWN) {
    return UNKNOWN_FIELD_TYPE_MESSAGE;
  }

  if (type === 'source') {
    // TODO: check if we can remove this logic as outdated

    // Note that this type is currently not provided, type for _source is undefined
    return i18n.translate('discover.fieldNameIcons.sourceFieldAriaLabel', {
      defaultMessage: 'Source field',
    });
  }

  const knownType: KNOWN_FIELD_TYPES = type as KNOWN_FIELD_TYPES;
  switch (knownType) {
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
    case KNOWN_FIELD_TYPES.DATE_RANGE:
      return i18n.translate('discover.fieldNameIcons.dateRangeFieldAriaLabel', {
        defaultMessage: 'Date range field',
      });
    case KNOWN_FIELD_TYPES.GEO_POINT:
      return i18n.translate('discover.fieldNameIcons.geoPointFieldAriaLabel', {
        defaultMessage: 'Geo point field',
      });
    case KNOWN_FIELD_TYPES.GEO_SHAPE:
      return i18n.translate('discover.fieldNameIcons.geoShapeFieldAriaLabel', {
        defaultMessage: 'Geo shape field',
      });
    case KNOWN_FIELD_TYPES.HISTOGRAM:
      return i18n.translate('discover.fieldNameIcons.histogramFieldAriaLabel', {
        defaultMessage: 'Histogram field',
      });
    case KNOWN_FIELD_TYPES.IP:
      return i18n.translate('discover.fieldNameIcons.ipAddressFieldAriaLabel', {
        defaultMessage: 'IP address field',
      });
    case KNOWN_FIELD_TYPES.IP_RANGE:
      return i18n.translate('discover.fieldNameIcons.ipRangeFieldAriaLabel', {
        defaultMessage: 'IP range field',
      });
    case KNOWN_FIELD_TYPES.MURMUR3:
      return i18n.translate('discover.fieldNameIcons.murmur3FieldAriaLabel', {
        defaultMessage: 'Murmur3 field',
      });
    case KNOWN_FIELD_TYPES.NUMBER:
      return i18n.translate('discover.fieldNameIcons.numberFieldAriaLabel', {
        defaultMessage: 'Number field',
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
      // If you see a typescript error here, that's a sign that there are missing switch cases ^^
      const _exhaustiveCheck: never = knownType;
      return knownType || _exhaustiveCheck;
  }
}
