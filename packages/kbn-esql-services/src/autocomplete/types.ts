/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface SuggestionRawDefinition {
  label: string;
  text: string;
  asSnippet?: boolean;
  kind: number;
  detail: string;
  documentation?: { value: string };
  sortText?: string;
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
