/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { monaco } from '../../../../monaco_imports';
import { getFunctionSignatures } from '../definitions/helpers';
import { getAstContext } from '../shared/context';
import { monacoPositionToOffset, getFunctionDefinition } from '../shared/helpers';
import type { AstProviderFn } from '../types';

export async function getHoverItem(
  model: monaco.editor.ITextModel,
  position: monaco.Position,
  token: monaco.CancellationToken,
  astProvider: AstProviderFn
) {
  const innerText = model.getValue();
  const offset = monacoPositionToOffset(innerText, position);

  const { ast } = await astProvider(innerText);
  const astContext = getAstContext(innerText, ast, offset);

  if (astContext.type !== 'function') {
    return { contents: [] };
  }

  const fnDefinition = getFunctionDefinition(astContext.node.name);

  if (!fnDefinition) {
    return { contents: [] };
  }

  return {
    contents: [
      { value: getFunctionSignatures(fnDefinition)[0].declaration },
      { value: fnDefinition.description },
    ],
  };
}
