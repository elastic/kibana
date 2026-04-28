/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlCodeAction } from '@kbn/esql-language';
import type { monaco } from '../../../../monaco_imports';

export function wrapAsMonacoCodeAction(
  model: monaco.editor.ITextModel,
  marker: monaco.editor.IMarkerData,
  quickFix: EsqlCodeAction
): monaco.languages.CodeAction {
  return {
    title: quickFix.title,
    kind: 'quickfix',
    diagnostics: [marker],
    edit: {
      edits: [
        {
          resource: model.uri,
          versionId: undefined,
          textEdit: {
            range: model.getFullModelRange(),
            text: quickFix.fixedText,
          },
        },
      ],
    },
  };
}
