/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { KbnFieldType } from './kbn_field_type';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from './types';

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
    name: KBN_FIELD_TYPES.CONFLICT,
  }),
  new KbnFieldType({
    name: KBN_FIELD_TYPES.UNKNOWN,
  }),
];
