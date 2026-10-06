/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import type { Tag, MatchedItem, ResolveIndexResponse } from '../types';
export declare const getIndicesViaResolve: ({
  http,
  pattern,
  showAllIndices,
  isRollupIndex,
  projectRouting,
}: {
  http: HttpStart;
  pattern: string;
  showAllIndices: boolean;
  isRollupIndex: (indexName: string) => boolean;
  projectRouting?: string;
}) => Promise<MatchedItem[]>;
export declare function getIndices({
  http,
  pattern: rawPattern,
  showAllIndices,
  isRollupIndex,
  projectRouting,
}: {
  http: HttpStart;
  pattern: string;
  showAllIndices?: boolean;
  isRollupIndex: (indexName: string) => boolean;
  projectRouting?: string;
}): Promise<MatchedItem[]>;
export declare const responseToItemArray: (
  response: ResolveIndexResponse,
  getTags: (indexName: string) => Tag[]
) => MatchedItem[];
