/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';
import { MutableRefObject } from 'react';
import { MonacoEditorActionsProvider } from './monaco_editor_actions_provider';

export const getSuggestionProvider = (
  actionsProvider: MutableRefObject<MonacoEditorActionsProvider | null>
): monaco.languages.CompletionItemProvider => {
  return {
    // force suggestions when these characters are used
    triggerCharacters: ['/', '.', '_', ',', '?', '=', '&', '"'],
    provideCompletionItems: (...args) => {
      if (actionsProvider.current) {
        return actionsProvider.current?.provideCompletionItems(...args);
      }
      return {
        suggestions: [],
      };
    },
  };
};
