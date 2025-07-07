/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
