/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { monaco } from '../../../../monaco_imports';
import { getAstContext } from '../shared/context';
import { monacoPositionToOffset } from '../shared/helpers';
import type { AstProviderFn } from '../types';

export async function getSignatureHelp(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  context: monaco.languages.SignatureHelpContext,
  astProvider: AstProviderFn
): Promise<monaco.languages.SignatureHelpResult> {
  const innerText = model.getValue();
  const offset = monacoPositionToOffset(innerText, position);

  const { ast } = await astProvider(innerText);
  const astContext = getAstContext(innerText, ast, offset);
  if (
    astContext.type === 'newCommand' &&
    ast.length > 0 &&
    !ast.some((command) => ['eval', 'stats'].includes(command.name))
  ) {
    return {
      value: {
        signatures: [
          {
            label: i18n.translate('monaco.esql.signature.evalStatsHint', {
              defaultMessage:
                'type EVAL to create new field, STATS [...] BY to group by or aggregate.',
            }),
            parameters: [],
          },
        ],
        activeParameter: 0,
        activeSignature: 0,
      },
      dispose: () => {},
    };
  }
  return {
    value: { signatures: [], activeParameter: 0, activeSignature: 0 },
    dispose: () => {},
  };
}
