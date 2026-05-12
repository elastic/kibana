/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSignatureHelp } from '@kbn/esql-language';
import type { monaco } from '../../../../monaco_imports';
import { createMonacoProvider } from './providers_factory';
import { monacoPositionToOffset } from '../shared/utils';
import type { ESQLDependencies } from './types';

export function getSignatureProvider(
  deps?: ESQLDependencies
): monaco.languages.SignatureHelpProvider {
  return {
    signatureHelpTriggerCharacters: ['(', ','],
    signatureHelpRetriggerCharacters: ['(', ','],
    async provideSignatureHelp(
      model: monaco.editor.ITextModel,
      position: monaco.Position
    ): Promise<monaco.languages.SignatureHelpResult | null> {
      return createMonacoProvider({
        model,
        run: async (safeModel) => {
          const fullText = safeModel.getValue();
          const offset = monacoPositionToOffset(fullText, position);
          const signatureHelp = await getSignatureHelp(fullText, offset, deps);

          if (!signatureHelp) {
            return null;
          }

          const { signatures, activeSignature, activeParameter } = signatureHelp;

          return {
            value: {
              signatures: signatures.map(({ label, documentation, parameters }) => ({
                label,
                documentation: documentation ? { value: documentation } : undefined,
                parameters: parameters.map(({ label: paramLabel, documentation: paramDoc }) => ({
                  label: paramLabel,
                  documentation: paramDoc ? { value: paramDoc } : undefined,
                })),
              })),
              activeSignature,
              activeParameter,
            },
            dispose: () => {},
          };
        },
        emptyResult: null,
      });
    },
  };
}
