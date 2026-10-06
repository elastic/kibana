/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLAstCommand } from '@elastic/esql/types';
/** Builds the rename map from commands that have already been parsed. */
export declare function buildRenameSourceFieldMapFromCommands(
  commands: readonly ESQLAstCommand[],
  query: string
): Map<string, string>;
/**
 * Pre-computes the rename source field resolution for every rename target in a single parse pass.
 * Use this when resolving multiple columns for the same query (e.g. a full column list from an
 * ES response). Only columns that actually resolve to a different source field are present in the
 * returned map; callers should fall back to the column name for absent entries.
 */
export declare function buildRenameSourceFieldMap(query: string): Map<string, string>;
