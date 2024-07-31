/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useRef } from 'react';
import { monaco } from '@kbn/monaco';

const OPEN_PAREN_REGEX = /^(.*:\s*|\s*)*{\s*/;
const CLOSE_PAREN_REGEX = /^\s*}\s*(,\s*|\s*)/;

/**
 * Hook that returns a function for registering a folding provider in the editor.
 *
 * @param langId The language id on which the folding provider will be applied
 */
export const useFoldingProvider = (langId: string) => {
  const foldingProviderDisposable = useRef<monaco.IDisposable | null>(null);

  const registerFoldingProvider = () => {
    foldingProviderDisposable.current = monaco.languages.registerFoldingRangeProvider(langId, {
      provideFoldingRanges: (model, token) => {
        const ranges: monaco.languages.ProviderResult<monaco.languages.FoldingRange[]> = [];
        const stack: number[] = [];
        const lineCount = model.getLineCount();

        for (let i = 1; i <= lineCount; i++) {
          const lineContent = model.getLineContent(i).trim();
          if (OPEN_PAREN_REGEX.test(lineContent)) {
            stack.push(i);
          } else if (CLOSE_PAREN_REGEX.test(lineContent)) {
            if (stack.length > 0) {
              const start = stack.pop();
              if (start) {
                ranges.push({
                  start,
                  end: i,
                });
              }
            }
          }
        }

        return ranges;
      },
    });
  };

  const unregisterFoldingProvider = () => {
    foldingProviderDisposable.current!.dispose();
  };

  return { registerFoldingProvider, unregisterFoldingProvider };
};
