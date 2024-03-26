/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
}

export interface EditorContext {
  /** The actual char that triggered the suggestion (1 single char) */
  triggerCharacter?: string;
  /** The type of trigger id. triggerKind = 0 is a programmatic trigger, while any other non-zero value is currently ignored. */
  triggerKind: number;
}
