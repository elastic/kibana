/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useRef } from 'react';
import { monaco } from '@kbn/monaco';

const getOpeningLineRegex = (openingMarker: string) => {
  // Opening parentheses can only be preceded by a colon or nothing
  // This ensures that it's not between quotes
  const regExStr = `^(.*:\\s*)?\\${openingMarker}$`;
  return new RegExp(regExStr);
};

const getClosingLineRegex = (closingMarker: string) => {
  // Closing marker can only be followed by a comma or nothing
  // This ensures that it's not between quotes
  const regExStr = `^\\${closingMarker}\\s*(,)?$`;
  return new RegExp(regExStr);
};

export const getFoldingRanges = (lines: string[], openingMarker: string, closingMarker: string) => {
  const ranges: monaco.languages.ProviderResult<monaco.languages.FoldingRange[]> = [];
  const stack: number[] = [];
  const openingLineRegex = getOpeningLineRegex(openingMarker);
  const closingLineRegex = getClosingLineRegex(closingMarker);

  for (let i = 0; i < lines.length; i++) {
    const lineContent = lines[i].trim();
    if (openingLineRegex.test(lineContent)) {
      stack.push(i + 1); // Line numbers start from 1 so we need to add 1 to the current index
    } else if (closingLineRegex.test(lineContent)) {
      const start = stack.pop();
      if (start) {
        ranges.push({
          start,
          end: i,
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
      provideFoldingRanges: (model) => [
        ...getFoldingRanges(model.getLinesContent(), '{', '}'),
        ...getFoldingRanges(model.getLinesContent(), '[', ']'),
      ],
    });
  };

  const unregisterFoldingProvider = () => {
    foldingProviderDisposable.current!.dispose();
  };

  return { registerFoldingProvider, unregisterFoldingProvider };
};
