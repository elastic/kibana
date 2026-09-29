/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isMap, isScalar, parseDocument } from 'yaml';
import { monaco } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import type {
  ServiceAccountDirectory,
  WorkflowServiceAccount,
} from '../../../../entities/service_accounts';

export interface ServiceAccountSuggestion extends monaco.languages.CompletionItem {
  account?: WorkflowServiceAccount;
}

const documents = new WeakMap<
  monaco.editor.ITextModel,
  { version: number; document: ReturnType<typeof parseDocument> }
>();

const getDocument = (model: monaco.editor.ITextModel): ReturnType<typeof parseDocument> => {
  const version = model.getVersionId();
  const cached = documents.get(model);
  if (cached?.version === version) return cached.document;
  // Use current text without reparsing it on every mouse move or waiting for debounced state.
  const document = parseDocument(model.getValue());
  documents.set(model, { version, document });
  return document;
};

export const getRunAsValue = (
  model: monaco.editor.ITextModel,
  position: monaco.Position
): { id: string; range: monaco.IRange } | null => {
  const document = getDocument(model);
  const settings = document.getIn(['settings'], true);
  if (!isMap(settings)) return null;
  const pair = settings.items.find(({ key }) => isScalar(key) && key.value === 'run_as');
  if (!pair || !isScalar(pair.key) || !pair.key.range || !isScalar(pair.value)) return null;
  const keyEnd = model.getPositionAt(pair.key.range[1]);
  if (position.lineNumber !== keyEnd.lineNumber) return null;
  const line = model.getLineContent(position.lineNumber);
  const separator = line.slice(keyEnd.column - 1).match(/^:[ \t]*/);
  if (!separator) return null;
  const value = pair.value;
  const afterColon = keyEnd.column + 1;
  if (position.column < afterColon) return null;
  const valueStartColumn =
    value.value === null
      ? Math.min(position.column, keyEnd.column + separator[0].length)
      : keyEnd.column + separator[0].length;
  if (position.column < valueStartColumn) return null;
  if (value.type === 'BLOCK_LITERAL' || value.type === 'BLOCK_FOLDED') return null;
  const end = value.range ? model.getPositionAt(value.range[1]) : position;
  if (end.lineNumber !== position.lineNumber) return null;
  const endColumn = Math.max(valueStartColumn, end.column);
  if (position.column > endColumn) return null;
  return {
    id: typeof value.value === 'string' ? value.value : '',
    range: {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: valueStartColumn,
      endColumn,
    },
  };
};

export const createServiceAccountEditor = (directory: ServiceAccountDirectory) => {
  const cursors: Array<string | undefined> = [undefined];
  let nextPage: string | undefined;

  const completionProvider = {
    triggerCharacters: [' ', ':', '"', "'"],
    provideCompletionItems: async (
      model: monaco.editor.ITextModel,
      position: monaco.Position,
      token: monaco.CancellationToken,
      refresh = false
    ): Promise<{
      suggestions: ServiceAccountSuggestion[];
      error?: 'forbidden' | 'unavailable';
    } | null> => {
      const value = getRunAsValue(model, position);
      if (!value || !directory.isEnabled()) return null;
      const suggestions: ServiceAccountSuggestion[] = [];
      const seen = new Set<string>();
      for (const cursor of cursors) {
        const page = await (refresh ? directory.list(cursor, true) : directory.list(cursor));
        if (token.isCancellationRequested) return { suggestions: [] };
        if (!page || 'error' in page) {
          cursors.splice(1);
          nextPage = undefined;
          return { suggestions: [], error: page?.error ?? 'unavailable' };
        }
        nextPage = page.nextPage;
        for (const account of page.serviceAccounts) {
          if (account.enabled && account.assumable && !seen.has(account.id)) {
            seen.add(account.id);
            suggestions.push({
              label: account.name,
              account,
              kind: monaco.languages.CompletionItemKind.Value,
              insertText:
                (model.getLineContent(position.lineNumber)[value.range.startColumn - 2] === ':'
                  ? ' '
                  : '') + JSON.stringify(account.id),
              range: value.range,
              filterText: `${account.name} ${account.id} "${account.name}" '${account.name}'`,
              sortText: `a_${account.name}`,
              detail: i18n.translate('workflows.editor.serviceAccountSuggestionLabel', {
                defaultMessage: 'Service account',
              }),
              documentation: account.id,
            });
          }
        }
      }
      if (nextPage && !cursors.includes(nextPage)) {
        const label = i18n.translate('workflows.editor.loadMoreServiceAccountsButtonLabel', {
          defaultMessage: 'Load more service accounts',
        });
        suggestions.push({
          label,
          kind: monaco.languages.CompletionItemKind.Text,
          insertText: '',
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column,
          },
          filterText: model
            .getLineContent(position.lineNumber)
            .slice(value.range.startColumn - 1, position.column - 1),
          sortText: 'z_load_more',
        });
      }
      return { suggestions };
    },
  };

  const getAccountAtPosition = async (
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ) => {
    const value = getRunAsValue(model, position);
    if (!value?.id || !directory.isEnabled()) return null;
    const account = await directory.get(value.id);
    return account ? { range: value.range, account } : null;
  };

  const loadMore = (): void => {
    if (nextPage && !cursors.includes(nextPage)) cursors.push(nextPage);
  };

  return { completionProvider, getAccountAtPosition, loadMore, isEnabled: directory.isEnabled };
};
