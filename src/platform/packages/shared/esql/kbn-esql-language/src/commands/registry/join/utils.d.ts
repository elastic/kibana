/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLFieldWithMetadata } from '@kbn/esql-types';
import type {
  ESQLAstAllCommands,
  ESQLAstJoinCommand,
  ESQLCommand,
  ESQLCommandOption,
} from '@elastic/esql/types';
import type { ICommand } from '../registry';
import type { GetColumnsByTypeFn, ICommandContext, ISuggestionItem } from '../types';
import type { JoinCommandPosition, JoinStaticPosition } from './types';
export declare const getFullCommandMnemonics: (
  command: ICommand
) => Array<[mnemonic: string, description: string]>;
export declare const getLookupFields: (
  command: ESQLCommand,
  getColumnsForQuery: (query: string) => Promise<ESQLFieldWithMetadata[]>,
  context?: ICommandContext
) => Promise<ESQLFieldWithMetadata[]>;
/** Returns the position based on regex matching. */
export declare const getStaticPosition: (text: string) => JoinStaticPosition;
export declare const getOnOption: (command: ESQLAstJoinCommand) => ESQLCommandOption | undefined;
export declare const getPosition: (
  text: string,
  command: ESQLAstAllCommands,
  cursorPosition: number
) => JoinCommandPosition;
/**
 * Identifies common fields between source and lookup suggestions and marks them appropriately.
 * Common fields are those that exist in both source and lookup with the same label.

 */
export declare const markCommonFields: (
  sourceSuggestions: ISuggestionItem[],
  lookupSuggestions: ISuggestionItem[]
) => {
  markedSourceSuggestions: ISuggestionItem[];
  uniqueLookupSuggestions: ISuggestionItem[];
  commonFieldLabels: Set<string>;
};
/** Creates an enriched context that includes lookup table fields in the columns map. */
export declare const createEnrichedContext: (
  originalContext: ICommandContext | undefined,
  joinCommand: ESQLAstJoinCommand,
  getColumnsForQuery: (query: string) => Promise<ESQLFieldWithMetadata[]>
) => Promise<ICommandContext | undefined>;
/**
 * Creates an enriched getByType function that includes lookup table fields
 * in addition to the source table fields.
 */
export declare const createEnrichedGetByType: (
  originalGetByType: GetColumnsByTypeFn,
  joinCommand: ESQLAstJoinCommand,
  getColumnsForQuery: (query: string) => Promise<ESQLFieldWithMetadata[]>,
  context?: ICommandContext
) => Promise<GetColumnsByTypeFn>;
export declare const isCommonField: (fieldName: string, context?: ICommandContext) => boolean;
