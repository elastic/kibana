/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { estypes } from '@elastic/elasticsearch';

/**
 * A field's sub type
 * @public
 */
export interface IFieldSubType {
  multi?: { parent: string };
  nested?: { path: string };
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

/**
 * @deprecated Use DataViewField instead. All index pattern interfaces were renamed.
 */
export type IndexPatternFieldBase = DataViewFieldBase;

/**
 * A base interface for an index pattern
 * @public
 */
export interface DataViewBase {
  fields: DataViewFieldBase[];
  id?: string;
  title?: string;
}

/**
 * @deprecated Use DataViewBase instead.  All index pattern interfaces were renamed.
 */
export type IndexPatternBase = DataViewBase;

export interface BoolQuery {
  must: estypes.QueryDslQueryContainer[];
  must_not: estypes.QueryDslQueryContainer[];
  filter: estypes.QueryDslQueryContainer[];
  should: estypes.QueryDslQueryContainer[];
}
