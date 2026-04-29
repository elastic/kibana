/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getQuickFixForMessage } from '@kbn/esql-language';
import type { monaco } from '../../../../monaco_imports';
import { createMonacoProvider } from './providers_factory';
import { wrapAsMonacoCodeAction } from '../converters/code_actions';
import { findMessageByMarker } from '../shared/utils';
import type { ESQLDependencies } from './types';

export function getCodeActionProvider(
  deps?: ESQLDependencies
): monaco.languages.CodeActionProvider {
  return {
    async provideCodeActions(model, _range, context, _token) {
      return createMonacoProvider({
        model,
        run: async (safeModel) => {
          const actions: monaco.languages.CodeAction[] = [];
          const modelDeps = deps?.getModelDependencies?.(model);
          const resolvedDeps = modelDeps ? { ...deps, ...modelDeps } : deps;

          const editorMessages = resolvedDeps?.getEditorMessages?.();
          const allMessages = editorMessages
            ? [...editorMessages.errors, ...editorMessages.warnings]
            : [];

          const queryString = safeModel.getValue();

          await Promise.all(
            context.markers.map(async (marker) => {
              const message = findMessageByMarker(allMessages, marker);
              if (!message) return [];
              const quickFix = await getQuickFixForMessage({
                queryString,
                message,
                callbacks: resolvedDeps,
              });

              if (quickFix) {
                actions.push(wrapAsMonacoCodeAction(safeModel, marker, quickFix));
              }
            })
          );
          return { actions, dispose: () => {} };
        },
        emptyResult: { actions: [], dispose: () => {} },
      });
    },
  };
}
