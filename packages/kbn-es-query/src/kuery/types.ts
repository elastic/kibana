/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SerializableRecord } from '@kbn/utility-types';
import { NodeTypes } from './node_types';

/** @public */
export interface KueryNode {
  type: keyof NodeTypes;
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
}
