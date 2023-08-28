/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { monaco } from '../../../monaco_imports';
import { exampleLabel } from '../autocomplete/autocomplete_definitions/utils';
import type { RawSignatureDefinition } from '../autocomplete/types';

export function getSignature(
  innerText: string,
  cursorPosition: number,
  signaturesLookup: Map<string, RawSignatureDefinition>
): monaco.languages.SignatureHelpResult {
  const lastPipeBeforeCursorIndex = innerText.substring(0, cursorPosition).lastIndexOf('|');
  const fnInContext = innerText
    .substring(lastPipeBeforeCursorIndex + 1)
    .split(' ')
    .find((word) => signaturesLookup.get(word.toLowerCase()));

  if (!fnInContext) {
    return {
      value: { signatures: [], activeParameter: 0, activeSignature: 0 },
      dispose: () => {},
    };
  }

  const signature = signaturesLookup.get(fnInContext.toLowerCase())!;
  return {
    value: {
      signatures: [
        {
          label: signature.signature,
          documentation: {
            value: `**${exampleLabel}** ${signature.examples[0]}`,
          },
          parameters: [],
        },
      ],
      activeParameter: 0,
      activeSignature: 0,
    },
    dispose: () => {},
  };
}
