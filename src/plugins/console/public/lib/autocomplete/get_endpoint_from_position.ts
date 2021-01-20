/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreEditor, Position } from '../../types';
import { getCurrentMethodAndTokenPaths } from './autocomplete';

// @ts-ignore
import { getTopLevelUrlCompleteComponents } from '../kb/kb';
// @ts-ignore
import { populateContext } from './engine';

export function getEndpointFromPosition(editor: CoreEditor, pos: Position, parser: any) {
  const lineValue = editor.getLineValue(pos.lineNumber);
  const context = {
    ...getCurrentMethodAndTokenPaths(
      editor,
      {
        column: lineValue.length + 1 /* Go to the very end of the line */,
        lineNumber: pos.lineNumber,
      },
      parser,
      true
    ),
  };
  const components = getTopLevelUrlCompleteComponents(context.method);
  populateContext(context.urlTokenPath, context, editor, true, components);
  return context.endpoint;
}
