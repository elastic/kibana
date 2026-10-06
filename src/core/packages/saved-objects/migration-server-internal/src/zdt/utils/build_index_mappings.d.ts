/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import {
  type IndexMapping,
  type IndexMappingMeta,
} from '@kbn/core-saved-objects-base-server-internal';
interface BuildIndexMappingsOpts {
  types: SavedObjectsType[];
}
/**
 * Build the mappings to use when creating a new index.
 *
 * @param types The list of all registered SO types.
 */
export declare const buildIndexMappings: ({ types }: BuildIndexMappingsOpts) => IndexMapping;
interface BuildIndexMetaOpts {
  types: SavedObjectsType[];
}
/**
 * Build the mapping _meta field to use when creating a new index.
 *
 * @param types The list of all registered SO types.
 */
export declare const buildIndexMeta: ({ types }: BuildIndexMetaOpts) => IndexMappingMeta;
export {};
