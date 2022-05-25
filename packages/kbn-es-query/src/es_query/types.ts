/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SerializableRecord } from '@kbn/utility-types';

/**
 * A field's sub type
 * @public
 */
export type IFieldSubType = IFieldSubTypeMultiOptional | IFieldSubTypeNestedOptional;

export interface IFieldSubTypeMultiOptional extends SerializableRecord {
  multi?: { parent: string };
}

export interface IFieldSubTypeMulti {
  multi: { parent: string };
}

export interface IFieldSubTypeNestedOptional extends SerializableRecord {
  nested?: { path: string };
}

export interface IFieldSubTypeNested {
  nested: { path: string };
}

/**
 * A base interface for an index pattern field
 * @public
 */
export interface DataViewFieldBase {
  name: string;
  /**
   * Kibana field type
   */
  type: string;
  subType?: IFieldSubType;
  /**
   * Scripted field painless script
   */
  script?: string;
  /**
   * Scripted field langauge
   * Painless is the only valid scripted field language
   */
  lang?: estypes.ScriptLanguage;
  scripted?: boolean;
}

export type DataViewFieldBaseSerializable = SerializableRecord & DataViewFieldBase;

/**
 * A base interface for an index pattern
 * @public
 */
export interface DataViewBase {
  fields: DataViewFieldBase[];
  id?: string;
  title: string;
}

export type DataViewBaseSerializable = SerializableRecord & DataViewBase;

export interface BoolQuery {
  must: estypes.QueryDslQueryContainer[];
  must_not: estypes.QueryDslQueryContainer[];
  filter: estypes.QueryDslQueryContainer[];
  should: estypes.QueryDslQueryContainer[];
}
