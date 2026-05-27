/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDocumentHighlightItems } from '@kbn/esql-language';
import { monaco } from '../../../../monaco_imports';
import { createMonacoProvider } from './providers_factory';
import { offsetToRowColumn } from '../converters/positions';
import { monacoPositionToOffset } from '../shared/utils';

export function getDocumentHighlightProvider(): monaco.languages.DocumentHighlightProvider {
  return {
    provideDocumentHighlights(
      model: monaco.editor.ITextModel,
      position: monaco.Position,
      _token: monaco.CancellationToken
    ) {
      return createMonacoProvider({
        model,
        run: (safeModel) => {
          const fullText = safeModel.getValue();
          const offset = monacoPositionToOffset(fullText, position);
          const items = getDocumentHighlightItems(fullText, offset);

          return items.map((item) => {
            const startPosition = offsetToRowColumn(fullText, item.start);
            const endPosition = offsetToRowColumn(fullText, item.end);
            return {
              range: new monaco.Range(
                startPosition.lineNumber,
                startPosition.column,
                endPosition.lineNumber,
                endPosition.column + 1
              ),
              kind: monaco.languages.DocumentHighlightKind.Read,
            };
          });
        },
        emptyResult: [],
      });
    },
  };
}
