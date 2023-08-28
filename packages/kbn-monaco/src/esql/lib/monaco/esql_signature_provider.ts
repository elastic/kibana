/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '../../../monaco_imports';
import { signatures } from '../autocomplete/autocomplete_definitions';
import { RawSignatureDefinition } from '../autocomplete/types';
import { getSignature } from '../signature';

export function createSignatureProvider() {
  const signaturesLookup: Map<string, RawSignatureDefinition> = new Map();
  for (const signature of signatures) {
    signaturesLookup.set(signature.label, signature);
  }

  return {
    signatureHelpTriggerCharacters: [' ', ''],
    provideSignatureHelp(
      model: monaco.editor.ITextModel,
      position: monaco.Position,
      token: monaco.CancellationToken,
      context: monaco.languages.SignatureHelpContext
    ): monaco.languages.SignatureHelpResult {
      const innerText = model.getValue();
      const textRange = model.getFullModelRange();

      const lengthAfterPosition = model.getValueLengthInRange({
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: textRange.endLineNumber,
        endColumn: textRange.endColumn,
      });

      const cursorPosition = innerText.length - lengthAfterPosition;

      return getSignature(innerText, cursorPosition, signaturesLookup);
    },
  };
}
