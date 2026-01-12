/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type { BaseMetadata } from './schema_connector_metadata';

/**
 * Function type for getting metadata from a Zod schema.
 */
export type GetMetaFn = (schema: z.ZodType) => BaseMetadata;

/**
 * Function type for setting metadata on a Zod schema.
 */
export type SetMetaFn = <T extends z.ZodType>(schema: T, meta: BaseMetadata) => T;

/**
 * Function type for adding/merging metadata on a Zod schema.
 */
export type AddMetaFn = <T extends z.ZodType>(schema: T, meta: Partial<BaseMetadata>) => T;

/**
 * Interface for meta functions that can be provided to the form generator.
 * This allows consumers to inject their own meta functions to ensure
 * they use the same Zod globalRegistry instance as their schema parser.
 */
export interface MetaFunctions {
  getMeta: GetMetaFn;
  setMeta: SetMetaFn;
  addMeta: AddMetaFn;
}
