/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IndexMapping, IndexMappingMeta } from '../mappings';
import type { VirtualVersionMap } from './version_map';
export interface GetModelVersionsFromMappingsOpts {
  mappings: IndexMapping;
  source: 'mappingVersions' | 'docVersions';
  /** if specified, will filter the types with the provided list */
  knownTypes?: string[];
  minimumVirtualVersion?: string;
}
/**
 * Build the version map from the specified source of the provided mappings.
 */
export declare const getVirtualVersionsFromMappings: ({
  mappings,
  source,
  knownTypes,
  minimumVirtualVersion,
}: GetModelVersionsFromMappingsOpts) => VirtualVersionMap | undefined;
export interface GetModelVersionsFromMappingMetaOpts {
  meta: IndexMappingMeta;
  source: 'mappingVersions' | 'docVersions';
  /** if specified, will filter the types with the provided list */
  knownTypes?: string[];
  minimumVirtualVersion?: string;
}
/**
 * Build the version map from the specified source of the provided mappings meta.
 */
export declare const getVirtualVersionsFromMappingMeta: ({
  meta,
  source,
  knownTypes,
  minimumVirtualVersion,
}: GetModelVersionsFromMappingMetaOpts) => VirtualVersionMap | undefined;
