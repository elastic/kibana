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
import { monaco } from '../../../../../monaco_imports';
import { createCancellableCallbacks, createMonacoProvider } from './providers_factory';
import { getDecorationHoveredMessages, monacoPositionToOffset } from '../shared/utils';
import type { ESQLDependencies } from './types';

export function getHoverProvider(deps?: ESQLDependencies): monaco.languages.HoverProvider {
  // Keyed by model rather than kept as a single value: this provider is registered once per
  // language and shared by every ES|QL editor, so one editor hovering a word would otherwise
  // suppress another editor's telemetry for that same word. Keyed weakly on the model so the
  // entry disappears with it — and on the real model, never the per-call safe proxy since that's minted on each call.
  const lastHoveredWordByModel = new WeakMap<monaco.editor.ITextModel, string>();

  return {
    provideHover: (async (model, position, token) => {
      return createMonacoProvider({
        model,
        cancellationToken: token,
        run: async (safeModel) => {
          const modelDeps = deps?.getModelDependencies?.(model);
          const resolvedDeps = modelDeps ? ({ ...deps, ...modelDeps } as ESQLDependencies) : deps;

          const fullText = safeModel.getValue();
          const offset = monacoPositionToOffset(fullText, position);
          const hoveredWord = safeModel.getWordAtPosition(position);
          // Monaco triggers the hover event on each char of the word,
          // we only want to track the hover event if the word changed.
          if (
            hoveredWord &&
            hoveredWord.word !== lastHoveredWordByModel.get(model) &&
            resolvedDeps?.telemetry?.onDecorationHoverShown
          ) {
            lastHoveredWordByModel.set(model, hoveredWord.word);

            const hoverMessages = getDecorationHoveredMessages(hoveredWord, position, safeModel);
            if (hoverMessages.length) {
              resolvedDeps?.telemetry?.onDecorationHoverShown(hoverMessages.join(', '));
            }
          }

          const cancellableCallbacks = createCancellableCallbacks(resolvedDeps, token);
          const hoverResult = await getHoverItem(fullText, offset, cancellableCallbacks);

          if (!resolvedDeps?.isSuggestFixEnabled) {
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
    }) satisfies monaco.languages.HoverProvider['provideHover'],
  };
}
