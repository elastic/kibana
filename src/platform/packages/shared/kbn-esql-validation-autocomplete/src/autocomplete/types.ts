/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLVariableType } from '../shared/types';

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

export interface SuggestionRawDefinition {
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
   */
  rangeToReplace?: {
    start: number;
    end: number;
  };
}

export interface EditorContext {
  /** The actual char that triggered the suggestion (1 single char) */
  triggerCharacter?: string;
  /**
   * monaco.editor.CompletionTriggerKind
   *
   * 0 is "Invoke" (user starts typing a word)
   * 1 is "Trigger character" (user types a trigger character)
   */
  triggerKind: number;
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
) => Promise<SuggestionRawDefinition[]>;
