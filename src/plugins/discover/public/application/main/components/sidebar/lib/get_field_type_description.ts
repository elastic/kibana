/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export function getFieldTypeDescription(type: string) {
  switch (type) {
    case 'boolean':
      return i18n.translate('discover.fieldNameDescription.booleanField', {
        defaultMessage: 'True and false values.',
      });
    case 'conflict':
      return i18n.translate('discover.fieldNameDescription.conflictField', {
        defaultMessage: 'Field has values of different types. Resolve in Management > Data Views.',
      });
    case 'date':
      return i18n.translate('discover.fieldNameDescription.dateField', {
        defaultMessage: 'A date string or the number of seconds or milliseconds since 1/1/1970.',
      });
    case 'date_range':
      return i18n.translate('discover.fieldNameDescription.dateField', {
        defaultMessage: 'Range of date values.',
      });
    case 'geo_point':
      return i18n.translate('discover.fieldNameDescription.geoPointField', {
        defaultMessage: 'Latitude and longitude points.',
      });
    case 'geo_shape':
      return i18n.translate('discover.fieldNameDescription.geoShapeField', {
        defaultMessage: 'Complex shapes, such as polygons.',
      });
    case 'ip':
      return i18n.translate('discover.fieldNameDescription.ipAddressField', {
        defaultMessage: 'IPv4 and IPv6 addresses.',
      });
    case 'ip_range':
      return i18n.translate('discover.fieldNameDescription.ipAddressField', {
        defaultMessage: 'Range of ip values supporting either IPv4 or IPv6 (or mixed) addresses.',
      });
    case 'murmur3':
      return i18n.translate('discover.fieldNameDescription.murmur3Field', {
        defaultMessage: 'Field that computes and stores hashes of values.',
      });
    case 'number':
      return i18n.translate('discover.fieldNameDescription.numberField', {
        defaultMessage: 'Long, integer, short, byte, double, and float values.',
      });
    case 'string':
      return i18n.translate('discover.fieldNameDescription.stringField', {
        defaultMessage: 'Full text such as the body of an email or a product description.',
      });
    case 'text':
      return i18n.translate('discover.fieldNameDescription.textField', {
        defaultMessage: 'Full text such as the body of an email or a product description.',
      });
    case 'keyword':
      return i18n.translate('discover.fieldNameDescription.keywordField', {
        defaultMessage:
          'Structured content such as an ID, email address, hostname, status code, or tag.',
      });

    case 'nested':
      return i18n.translate('discover.fieldNameDescription.nestedField', {
        defaultMessage: 'JSON object that preserves the relationship between its subfields.',
      });
    case 'version':
      return i18n.translate('discover.fieldNameDescription.versionField', {
        defaultMessage: 'Software versions. Supports Semantic Versioning precedence rules.',
      });
    default:
      return i18n.translate('discover.fieldNameDescription.unknownField', {
        defaultMessage: 'Unknown field',
      });
  }
}
