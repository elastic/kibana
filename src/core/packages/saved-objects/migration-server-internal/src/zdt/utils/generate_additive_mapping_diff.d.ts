/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectsType,
  SavedObjectsMappingProperties,
} from '@kbn/core-saved-objects-server';
import { type IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
interface GenerateAdditiveMappingsDiffOpts {
  types: SavedObjectsType[];
  mapping: IndexMapping;
  deletedTypes: string[];
}
/**
 * Generates the additive mapping diff we will need to update the index mapping with.
 *
 * @param types The types to generate the diff for
 * @param meta The meta field of the index we're migrating
 * @param deletedTypes The list of deleted types to ignore during diff/comparison
 */
export declare const generateAdditiveMappingDiff: ({
  types,
  mapping,
  deletedTypes,
}: GenerateAdditiveMappingsDiffOpts) => SavedObjectsMappingProperties;
export {};
