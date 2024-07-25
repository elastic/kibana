/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useRef } from 'react';
import { monaco } from '@kbn/monaco';
import { SELECTED_REQUESTS_CLASSNAME } from '../utils';

/**
 *
 */
export const useHighlightStatusCodes = (editor: monaco.editor.IStandaloneCodeEditor) => {
  const highlightedLines = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

  const highlightStatusCodes = (data: string) => {
    highlightedLines.current?.set([
      {
        range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 10 },
        options: {
          isWholeLine: true,
          className: SELECTED_REQUESTS_CLASSNAME,
        },
      },
    ]);
  };

  const clearStatusCodeHighlights = () => {
    highlightedLines.current!.clear();
  };

  return { highlightStatusCodes, clearStatusCodeHighlights };
};
