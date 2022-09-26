/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

/**
 * A field's sub type
 * @public
 */
export type IFieldSubType = IFieldSubTypeMultiOptional | IFieldSubTypeNestedOptional;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type IFieldSubTypeMultiOptional = {
  multi?: { parent: string };
};

export interface IFieldSubTypeMulti {
  multi: { parent: string };
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type IFieldSubTypeNestedOptional = {
  nested?: { path: string };
};

export interface IFieldSubTypeNested {
  nested: { path: string };
}

/**
 * A base interface for an index pattern field
 * @public
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type DataViewFieldBase = {
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
   * Scripted field language
   * Painless is the only valid scripted field language
   */
  lang?: estypes.ScriptLanguage;
  scripted?: boolean;
  /**
   * ES field types as strings array.
   */
  esTypes?: string[];
};

/**
 * A base interface for an index pattern
 * @public
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type DataViewBase = {
  fields: DataViewFieldBase[];
  id?: string;
  title: string;
};

export interface BoolQuery {
  must: estypes.QueryDslQueryContainer[];
  must_not: estypes.QueryDslQueryContainer[];
  filter: estypes.QueryDslQueryContainer[];
  should: estypes.QueryDslQueryContainer[];
}
