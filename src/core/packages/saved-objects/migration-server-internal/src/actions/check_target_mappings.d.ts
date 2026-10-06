/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as TaskEither from 'fp-ts/TaskEither';
import type { IndexMapping, VirtualVersionMap } from '@kbn/core-saved-objects-base-server-internal';
/** @internal */
export interface CheckTargetTypesMappingsParams {
  indexTypes: string[];
  indexMappings?: IndexMapping;
  appMappings: IndexMapping;
  latestMappingsVersions: VirtualVersionMap;
  hashToVersionMap?: Record<string, string>;
}
/** @internal */
export interface IndexMappingsIncomplete {
  type: 'index_mappings_incomplete';
}
/** @internal */
export interface TypesMatch {
  type: 'types_match';
}
/** @internal */
export interface TypesChanged {
  type: 'types_changed';
  updatedTypes: string[];
}
/** @internal */
export interface TypesAdded {
  type: 'types_added';
  newTypes: string[];
}
export declare const checkTargetTypesMappings: ({
  indexTypes,
  indexMappings,
  appMappings,
  latestMappingsVersions,
  hashToVersionMap,
}: CheckTargetTypesMappingsParams) => TaskEither.TaskEither<
  IndexMappingsIncomplete | TypesChanged | TypesAdded,
  TypesMatch
>;
