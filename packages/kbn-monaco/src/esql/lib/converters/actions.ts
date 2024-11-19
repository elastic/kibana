/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CodeAction } from '@kbn/esql-validation-autocomplete';
import { monaco } from '../../../monaco_imports';
import { MonacoCodeAction } from '../types';
import { wrapAsMonacoMessages } from './positions';

export function wrapAsMonacoCodeActions(
  model: monaco.editor.ITextModel,
  actions: CodeAction[]
): MonacoCodeAction[] {
  const queryString = model.getValue();
  const uri = model.uri;
  return actions.map((action) => {
    const [error] = wrapAsMonacoMessages(queryString, action.diagnostics);
    return {
      title: action.title,
      diagnostics: [error],
      kind: action.kind,
      edit: {
        edits: action.edits.map((edit) => {
          return {
            resource: uri,
            textEdit: {
              range: error,
              text: edit.text,
            },
            versionId: undefined,
          };
        }),
      },
    };
  });
}
