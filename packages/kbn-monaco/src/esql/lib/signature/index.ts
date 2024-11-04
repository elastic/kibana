/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AstProviderFn } from '@kbn/esql-ast';
import type { monaco } from '../../../monaco_imports';

export function getSignatureHelp(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  context: monaco.languages.SignatureHelpContext,
  astProvider: AstProviderFn
): monaco.languages.SignatureHelpResult {
  return {
    value: { signatures: [], activeParameter: 0, activeSignature: 0 },
    dispose: () => {},
  };
}
