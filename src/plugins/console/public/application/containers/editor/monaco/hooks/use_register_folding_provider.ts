/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useRef } from 'react';
import { monaco } from '@kbn/monaco';

// The following regex's make sure that the parentheses are not between quotes

// Opening parentheses can only be preceded by a : character or nothing
const OPEN_PAREN_REGEX = /(^.*:\s*|^){$/;
// Closing parentheses can only be followed by a comma, another closing parenthesis, or nothing
const CLOSE_PAREN_REGEX = /^}\s*(,|)$/;

export const getFoldingRanges = (lines: string[]) => {
  const ranges: monaco.languages.ProviderResult<monaco.languages.FoldingRange[]> = [];
  const stack: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineContent = lines[i].trim();
    const lineNumber = i + 1; // Line numbers start from 1 so we need to add 1 to the current index
    if (OPEN_PAREN_REGEX.test(lineContent)) {
      stack.push(lineNumber);
    } else if (CLOSE_PAREN_REGEX.test(lineContent)) {
      const start = stack.pop();
      if (start) {
        ranges.push({
          start,
          end: lineNumber,
        });
      }
    }
  }

  return ranges;
};

/**
 * Hook that returns a function for registering a folding provider in the editor.
 *
 * @param langId The language id on which the folding provider will be applied
 */
export const useFoldingProvider = (langId: string) => {
  const foldingProviderDisposable = useRef<monaco.IDisposable | null>(null);

  const registerFoldingProvider = () => {
    foldingProviderDisposable.current = monaco.languages.registerFoldingRangeProvider(langId, {
      provideFoldingRanges: (model, token) => getFoldingRanges(model.getLinesContent()),
    });
  };

  const unregisterFoldingProvider = () => {
    foldingProviderDisposable.current!.dispose();
  };

  return { registerFoldingProvider, unregisterFoldingProvider };
};
