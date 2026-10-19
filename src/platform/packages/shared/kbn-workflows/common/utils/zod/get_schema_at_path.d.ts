/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
/**
 * Stand-in segment for a Liquid dynamic subscript (`[ep.rule_id]`, `[item]`).
 * Must not collide with a real object key.
 */
export declare const LIQUID_DYNAMIC_KEY_SEGMENT = '__liquid_dynamic_key__';
export declare function parsePath(path: string): string[] | null;
interface GetSchemaAtPathResult {
  schema: z.ZodType | null;
  scopedToPath: string | null;
}
/**
 * Get zod schema at a given path.
 * @param schema - The zod schema to get the path from.
 * @param path - The path to get the schema from. e.g. `choices[0].message['content']`
 * @param options - The options for the function.
 * @param options.partial - If true, return the schema for the last valid path segment.
 * @returns The schema at the given path or null if the path is invalid.
 */
export declare function getSchemaAtPath(
  schema: z.ZodType,
  path: string,
  {
    partial,
  }?: {
    partial?: boolean;
  }
): GetSchemaAtPathResult;
export {};
