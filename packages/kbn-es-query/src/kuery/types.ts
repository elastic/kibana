/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SerializableRecord } from '@kbn/utility-types';
import { KQL_NODE_TYPE_LITERAL } from './node_types/literal';

/** @public */
export type KqlNodeType = typeof KQL_NODE_TYPE_LITERAL | 'function' | 'wildcard';

/** @public */
export interface KueryNode {
  type: KqlNodeType;
  [key: string]: any;
}

/**
 * @public
 */
export type DslQuery = estypes.QueryDslQueryContainer;

/** @internal */
export interface KueryParseOptions {
  helpers: SerializableRecord;
  startRule: string;
  allowLeadingWildcards: boolean;
  cursorSymbol?: string;
  parseCursor?: boolean;
}

export { nodeTypes } from './node_types';

/** @public */
export interface KueryQueryOptions {
  filtersInMustClause?: boolean;
  dateFormatTZ?: string;

  /**
   * the Nested field type requires a special query syntax, which includes an optional ignore_unmapped parameter that indicates whether to ignore an unmapped path and not return any documents instead of an error.
   * The optional ignore_unmapped parameter defaults to false.
   * The `nestedIgnoreUnmapped` param allows creating queries with "ignore_unmapped": true
   */
  nestedIgnoreUnmapped?: boolean;
}
