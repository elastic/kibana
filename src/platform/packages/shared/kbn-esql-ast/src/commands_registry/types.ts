/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  ESQLVariableType,
  IndexAutocompleteItem,
  InferenceEndpointAutocompleteItem,
  ESQLControlVariable,
} from '@kbn/esql-types';
import type { ESQLLocation } from '../types';
import type { FieldType, SupportedDataType } from '../definitions/types';
import type { EditorExtensions } from './options/recommended_queries';

// This is a subset of the Monaco's editor CompletitionItemKind type
export type ItemKind =
  | 'Method'
  | 'Function'
  | 'Field'
  | 'Variable'
  | 'Class'
  | 'Operator'
  | 'Value'
  | 'Constant'
  | 'Keyword'
  | 'Text'
  | 'Reference'
  | 'Snippet'
  | 'Issue';

export interface ISuggestionItem {
  /* The label to show on the suggestion UI for the entry */
  label: string;
  /* The actual text to insert into the editor */
  text: string;
  /* Text to use for filtering the suggestions */
  filterText?: string;
  /**
   * Should the text be inserted as a snippet?
   * That is usually used for special behaviour like moving the cursor in a specific position
   * after inserting the text.
   * i.e. 'fnName( $0 )' will insert fnName( ) and move the cursor where $0 is.
   * */
  asSnippet?: boolean;
  /**
   * This is useful to identify the suggestion type and apply different styles to it.
   */
  kind: ItemKind;
  /**
   * A very short description for the suggestion entry that can be shown on the UI next to the label
   */
  detail: string;
  /**
   * A longer description for the suggestion entry that can be shown on demand on the UI.
   */
  documentation?: { value: string };
  /**
   * A string to use for sorting the suggestion within the suggestions list
   */
  sortText?: string;
  /**
   * Suggestions can trigger a command by id. This is useful to trigger specific actions in some contexts
   */
  command?: {
    title: string;
    id: string;
  };
  /**
   * The range that should be replaced when the suggestion is applied
   *
   * IMPORTANT NOTE!!!
   *
   * This range is ZERO-based and NOT end-inclusive — [start, end)
   * Also, do NOT try to account for newline characters. This is taken care of later.
   */
  rangeToReplace?: {
    start: number;
    end: number;
  };
}

export type GetColumnsByTypeFn = (
  type: Readonly<string> | Readonly<string[]>,
  ignored?: string[],
  options?: {
    advanceCursor?: boolean;
    openSuggestions?: boolean;
    addComma?: boolean;
    variableType?: ESQLVariableType;
  }
) => Promise<ISuggestionItem[]>;

export interface ESQLFieldWithMetadata {
  name: string;
  type: FieldType;
  isEcs?: boolean;
  hasConflict?: boolean;
  metadata?: {
    description?: string;
  };
}

export interface ESQLUserDefinedColumn {
  name: string;
  // invalid expressions produce columns of type "unknown"
  // also, there are some cases where we can't yet infer the type of
  // a valid expression as with `CASE` which can return union types
  type: SupportedDataType | 'unknown';
  location: ESQLLocation;
}

export interface ESQLPolicy {
  name: string;
  sourceIndices: string[];
  matchField: string;
  enrichFields: string[];
}

export interface ICommandCallbacks {
  getByType?: GetColumnsByTypeFn;
  getSuggestedUserDefinedColumnName?: (extraFieldNames?: string[] | undefined) => string;
  getColumnsForQuery?: (query: string) => Promise<ESQLFieldWithMetadata[]>;
  getJoinIndices?: () => Promise<ESQLSourceResult[]>;
  getCurrentAppId?: () => Promise<string | undefined>;
}

export interface ICommandContext {
  userDefinedColumns: Map<string, ESQLUserDefinedColumn[]>;
  fields: Map<string, ESQLFieldWithMetadata>;
  sources?: ESQLSourceResult[];
  joinSources?: IndexAutocompleteItem[];
  timeSeriesSources?: IndexAutocompleteItem[];
  inferenceEndpoints?: InferenceEndpointAutocompleteItem[];
  policies?: Map<string, ESQLPolicy>;
  editorExtensions?: EditorExtensions;
  variables?: ESQLControlVariable[];
  supportsControls?: boolean;
  histogramBarTarget?: number;
  appId?: string;
}

/**
 * This is a list of locations within an ES|QL query.
 *
 * It is currently used to suggest appropriate functions and
 * operators given the location of the cursor.
 */
export enum Location {
  /**
   * In the top-level EVAL command
   */
  EVAL = 'eval',

  /**
   * In the top-level WHERE command
   */
  WHERE = 'where',

  /**
   * In the top-level ROW command
   */
  ROW = 'row',

  /**
   * In the top-level SORT command
   */
  SORT = 'sort',

  /**
   * In the top-level STATS command
   */
  STATS = 'stats',

  /**
   * In a grouping clause
   */
  STATS_BY = 'stats_by',

  /**
   * In a per-agg filter
   */
  STATS_WHERE = 'stats_where',

  /**
   * WHEN TS is used as a source command, inner STATS functions
   */
  STATS_TIMESERIES = 'stats_timeseries',

  /**
   * Top-level ENRICH command
   */
  ENRICH = 'enrich',

  /**
   * ENRICH...WITH clause
   */
  ENRICH_WITH = 'enrich_with',

  /**
   * In the top-level DISSECT command (used only for
   * assignment in APPEND_SEPARATOR)
   */
  DISSECT = 'dissect',

  /**
   * In RENAME (used only for AS)
   */
  RENAME = 'rename',

  /**
   * In the JOIN command (used only for AS)
   */
  JOIN = 'join',

  /**
   * In the SHOW command
   */
  SHOW = 'show',

  /**
   * In the COMPLETION command
   */
  COMPLETION = 'completion',
}

export interface ESQLSourceResult {
  name: string;
  hidden: boolean;
  title?: string;
  dataStreams?: Array<{ name: string; title?: string }>;
  type?: string;
}

const commandOptionNameToLocation: Record<string, Location> = {
  eval: Location.EVAL,
  where: Location.WHERE,
  row: Location.ROW,
  sort: Location.SORT,
  stats: Location.STATS,
  by: Location.STATS_BY,
  enrich: Location.ENRICH,
  with: Location.ENRICH_WITH,
  dissect: Location.DISSECT,
  rename: Location.RENAME,
  join: Location.JOIN,
  show: Location.SHOW,
  completion: Location.COMPLETION,
};

/**
 * Pause before using this in new places. Where possible, use the Location enum directly.
 *
 * This is primarily around for backwards compatibility with the old system of command and option names.
 */
export const getLocationFromCommandOrOptionName = (name: string) =>
  commandOptionNameToLocation[name];
