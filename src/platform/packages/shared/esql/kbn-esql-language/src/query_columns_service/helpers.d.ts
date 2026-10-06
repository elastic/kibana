/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks, ESQLFieldWithMetadata, IndexAutocompleteItem } from '@kbn/esql-types';
import type { ESQLAstCommand } from '@elastic/esql/types';
import type { UnmappedFieldsStrategy } from '../commands/registry/types';
import { type ESQLColumnData, type ESQLPolicy } from '../commands/registry/types';
export declare function getFieldsFromES(
  query: string,
  resourceRetriever?: ESQLCallbacks
): Promise<ESQLFieldWithMetadata[]>;
/**
 * After KEEP or STATS, no new unmapped fields are added as they were erased by those destructive commands.
 */
export declare function areNewUnmappedFieldsAllowed(previousCommands: ESQLAstCommand[]): boolean;
export declare function getUnmappedFields(
  command: ESQLAstCommand,
  previousCommands: ESQLAstCommand[],
  previousPipeFields: ESQLColumnData[],
  unmappedFieldsStrategy?: UnmappedFieldsStrategy
): ESQLColumnData[];
/**
 * @param query, the ES|QL query
 * @param commands, the AST commands
 * @param previousPipeFields, the fields from the previous pipe
 * @returns a list of fields that are available for the current pipe
 */
export declare function getCurrentQueryAvailableColumns(
  commands: ESQLAstCommand[],
  previousPipeFields: ESQLColumnData[],
  fetchFields: (query: string) => Promise<ESQLFieldWithMetadata[]>,
  getPolicies: () => Promise<Map<string, ESQLPolicy>>,
  getTimeseriesIndices: () => Promise<{
    indices: IndexAutocompleteItem[];
  }>,
  originalQueryText: string,
  unmappedFieldsStrategy?: UnmappedFieldsStrategy
): Promise<ESQLColumnData[]>;
