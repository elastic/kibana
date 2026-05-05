/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getHoverItem } from '@kbn/esql-language';
import type { monaco } from '../../../../monaco_imports';
import { createMonacoProvider } from './providers_factory';
import { getDecorationHoveredMessages, monacoPositionToOffset } from '../shared/utils';
import type { ESQLDependencies } from './types';

export function getHoverProvider(deps?: ESQLDependencies): monaco.languages.HoverProvider {
  let lastHoveredWord: string;

  return {
    async provideHover(model: monaco.editor.ITextModel, position: monaco.Position) {
      return createMonacoProvider({
        model,
        run: async (safeModel) => {
          const fullText = safeModel.getValue();
          const offset = monacoPositionToOffset(fullText, position);
          const hoveredWord = safeModel.getWordAtPosition(position);

          // Monaco triggers the hover event on each char of the word,
          // we only want to track the Hover if the word changed.
          if (
            hoveredWord &&
            hoveredWord.word !== lastHoveredWord &&
            deps?.telemetry?.onDecorationHoverShown
          ) {
            lastHoveredWord = hoveredWord.word;

            const hoverMessages = getDecorationHoveredMessages(hoveredWord, position, safeModel);
            if (hoverMessages.length) {
              deps?.telemetry?.onDecorationHoverShown(hoverMessages.join(', '));
            }
          }

          return getHoverItem(fullText, offset, deps);
        },
        emptyResult: null,
      });
    },
  };
}
