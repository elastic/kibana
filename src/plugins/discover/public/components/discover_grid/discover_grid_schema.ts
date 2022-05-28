/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import { kibanaJSON } from './constants';

export function getSchemaByKbnType(kbnType: string | undefined) {
  // Default DataGrid schemas: boolean, numeric, datetime, json, currency, string
  switch (kbnType) {
    case KBN_FIELD_TYPES.IP:
    case KBN_FIELD_TYPES.GEO_SHAPE:
    case KBN_FIELD_TYPES.NUMBER:
      return 'numeric';
    case KBN_FIELD_TYPES.BOOLEAN:
      return 'boolean';
    case KBN_FIELD_TYPES.STRING:
      return 'string';
    case KBN_FIELD_TYPES.DATE:
      return 'datetime';
    default:
      return kibanaJSON;
  }
}

export function getSchemaDetectors() {
  return [
    {
      type: kibanaJSON,
      detector() {
        return 0; // this schema is always explicitly defined
      },
      sortTextAsc: '',
      sortTextDesc: '',
      icon: '',
      color: '',
    },
  ];
}
