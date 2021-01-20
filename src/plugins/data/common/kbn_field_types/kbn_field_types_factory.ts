/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { KbnFieldType } from './kbn_field_type';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from './types';

export const kbnFieldTypeUnknown = new KbnFieldType({
  name: KBN_FIELD_TYPES.UNKNOWN,
});

export const createKbnFieldTypes = (): KbnFieldType[] => [
  new KbnFieldType({
    name: KBN_FIELD_TYPES.STRING,
    sortable: true,
    filterable: true,
    esTypes: [
      ES_FIELD_TYPES.STRING,
      ES_FIELD_TYPES.TEXT,
      ES_FIELD_TYPES.KEYWORD,
      ES_FIELD_TYPES._TYPE,
      ES_FIELD_TYPES._ID,
    ],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.NUMBER,
    sortable: true,
    filterable: true,
    esTypes: [
      ES_FIELD_TYPES.FLOAT,
      ES_FIELD_TYPES.HALF_FLOAT,
      ES_FIELD_TYPES.SCALED_FLOAT,
      ES_FIELD_TYPES.DOUBLE,
      ES_FIELD_TYPES.INTEGER,
      ES_FIELD_TYPES.LONG,
      ES_FIELD_TYPES.UNSIGNED_LONG,
      ES_FIELD_TYPES.SHORT,
      ES_FIELD_TYPES.BYTE,
      ES_FIELD_TYPES.TOKEN_COUNT,
    ],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.DATE,
    sortable: true,
    filterable: true,
    esTypes: [ES_FIELD_TYPES.DATE, ES_FIELD_TYPES.DATE_NANOS],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.IP,
    sortable: true,
    filterable: true,
    esTypes: [ES_FIELD_TYPES.IP],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.BOOLEAN,
    sortable: true,
    filterable: true,
    esTypes: [ES_FIELD_TYPES.BOOLEAN],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.OBJECT,
    esTypes: [ES_FIELD_TYPES.OBJECT],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.NESTED,
    esTypes: [ES_FIELD_TYPES.NESTED],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.GEO_POINT,
    esTypes: [ES_FIELD_TYPES.GEO_POINT],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.GEO_SHAPE,
    esTypes: [ES_FIELD_TYPES.GEO_SHAPE],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.ATTACHMENT,
    esTypes: [ES_FIELD_TYPES.ATTACHMENT],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.MURMUR3,
    esTypes: [ES_FIELD_TYPES.MURMUR3],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES._SOURCE,
    esTypes: [ES_FIELD_TYPES._SOURCE],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.HISTOGRAM,
    filterable: true,
    esTypes: [ES_FIELD_TYPES.HISTOGRAM],
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.CONFLICT,
  }),
  kbnFieldTypeUnknown,
];
