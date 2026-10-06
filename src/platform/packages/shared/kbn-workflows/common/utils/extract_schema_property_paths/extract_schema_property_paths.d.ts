/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type ZodTypeKind } from '../zod/get_zod_schema_type';
export interface ExtractedSchemaPropertyPath {
  path: string;
  type: ZodTypeKind;
  description?: string;
  displayType?: string;
}
export interface ExtractSchemaPropertyPathsOptions {
  /**
   * When true, each entry includes `description` (from Zod `.describe()`) and `displayType`
   */
  includeMetadata?: boolean;
}
export declare function extractSchemaPropertyPaths(
  zodSchema: unknown,
  options?: ExtractSchemaPropertyPathsOptions
): ExtractedSchemaPropertyPath[];
