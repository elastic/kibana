/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { getHoverItem } from '@kbn/esql-language';
import { FIX_WITH_AI_COMMAND_ID } from '@kbn/esql-types';
import { monaco } from '../../../../monaco_imports';
import { createCancellableCallbacks, createMonacoProvider } from './providers_factory';
import { getDecorationHoveredMessages, monacoPositionToOffset } from '../shared/utils';
import type { ESQLDependencies } from './types';

export function getHoverProvider(deps?: ESQLDependencies): monaco.languages.HoverProvider {
  let lastHoveredWord: string;

  return {
    async provideHover(
      model: monaco.editor.ITextModel,
      position: monaco.Position,
      token: monaco.CancellationToken
    ) {
      return createMonacoProvider({
        model,
        run: async (safeModel) => {
          const fullText = safeModel.getValue();
          const offset = monacoPositionToOffset(fullText, position);
          const hoveredWord = safeModel.getWordAtPosition(position);
          // Monaco triggers the hover event on each char of the word,
          // we only want to track the hover event if the word changed.
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

          const cancellableCallbacks = createCancellableCallbacks(deps, token);
          const hoverResult = await getHoverItem(fullText, offset, cancellableCallbacks);

          if (!deps?.isSuggestFixEnabled) {
            return hoverResult;
          }

          const markers = monaco.editor.getModelMarkers({ resource: model.uri });
          const errorAtPosition = markers.find(
            (m) =>
              m.severity === monaco.MarkerSeverity.Error &&
              m.startLineNumber <= position.lineNumber &&
              position.lineNumber <= m.endLineNumber &&
              (m.startLineNumber < position.lineNumber || m.startColumn <= position.column) &&
              (m.endLineNumber > position.lineNumber || position.column <= m.endColumn)
          );

          if (!errorAtPosition) {
            return hoverResult;
          }

          const rawCode = errorAtPosition.code;
          const errorCode = typeof rawCode === 'string' ? rawCode : rawCode?.value;

          const args = [
            fullText,
            errorAtPosition.message,
            errorCode,
            errorAtPosition.startLineNumber,
            model.uri.toString(),
          ];
          const commandUri = `command:${FIX_WITH_AI_COMMAND_ID}?${encodeURIComponent(
            JSON.stringify(args)
          )}`;
          const fixLink: monaco.IMarkdownString = {
            value: `[${i18n.translate('monaco.esql.fixWithAI.hoverLink', {
              defaultMessage: '✨ Fix with AI',
            })}](${commandUri})`,
            isTrusted: true,
          };

          if (!hoverResult) {
            return { contents: [fixLink] };
          }

          return { ...hoverResult, contents: [...hoverResult.contents, fixLink] };
        },
        emptyResult: null,
      });
    },
  };
}
