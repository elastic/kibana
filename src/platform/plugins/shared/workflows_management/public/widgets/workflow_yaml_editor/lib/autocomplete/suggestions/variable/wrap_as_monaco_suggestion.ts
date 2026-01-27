/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Scalar } from 'yaml';
import { monaco } from '@kbn/monaco';
import { PROPERTY_PATH_REGEX } from '../../../../../../../common/lib/regex';

export function wrapAsMonacoSuggestion(
  key: string,
  triggerCharacter: string | null,
  range: monaco.IRange,
  scalarType: Scalar.Type | null,
  shouldBeQuoted: boolean,
  type: string,
  description?: string,
  useCurlyBraces: boolean = true
): monaco.languages.CompletionItem {
  let keyToInsert = key;
  const isAt = triggerCharacter === '@';
  const keyCouldAccessedByDot = PROPERTY_PATH_REGEX.test(key);
  const removeDot = isAt || !keyCouldAccessedByDot;

  if (!keyCouldAccessedByDot) {
    // we need to use opposite quote type if we are in a string
    const q = scalarType === 'QUOTE_DOUBLE' ? "'" : '"';
    keyToInsert = `[${q}${key}${q}]`;
  }

  let insertText = keyToInsert;
  let insertTextRules = monaco.languages.CompletionItemInsertTextRule.None;
  if (isAt) {
    // $0 is the cursor position - only add it when we're wrapping in new braces
    // When inside existing braces, just insert the key without placeholder
    if (useCurlyBraces) {
      insertText = `{{ ${key}$0 }}`;
      insertTextRules = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
    } else {
      // Inside existing braces, just insert the key without placeholder
      insertText = keyToInsert;
    }
  }
  if (shouldBeQuoted) {
    insertText = `"${insertText}"`;
  }
  return {
    label: key,
    kind: monaco.languages.CompletionItemKind.Field,
    range,
    insertText,
    detail: `${type}${description ? `: ${description}` : ''}`,
    insertTextRules,
    additionalTextEdits: removeDot
      ? [
          {
            // remove the @
            range: {
              startLineNumber: range.startLineNumber,
              endLineNumber: range.endLineNumber,
              startColumn: range.startColumn - 1,
              endColumn: range.endColumn,
            },
            text: '',
          },
        ]
      : [],
  };
}
