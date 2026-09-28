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
import type { ServiceAccountDirectory } from '../../../../entities/service_accounts';

export interface ServiceAccountEditorContext {
  isServerless: boolean;
  projectName?: string;
  projectId?: string;
}

const escapeMarkdown = (value: string): string =>
  value.replace(/[\r\n]+/g, ' ').replace(/[\\`*_{}[\]()<>#+.!|~-]/g, '\\$&');

export const LOAD_MORE_SERVICE_ACCOUNTS = 'workflows.editor.loadMoreServiceAccounts';

export const getRunAsValue = (
  model: monaco.editor.ITextModel,
  position: monaco.Position
): { id: string; range: monaco.IRange } | null => {
  if (!/^\s*run_as\s*:/.test(model.getLineContent(position.lineNumber))) return null;
  // Completion must use the current text, even before the debounced editor state catches up.
  const document = parseDocument(model.getValue());
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

export const createServiceAccountEditor = (
  directory: ServiceAccountDirectory,
  context: ServiceAccountEditorContext = { isServerless: false }
) => {
  const cursors: Array<string | undefined> = [undefined];
  let nextPage: string | undefined;

  const completionProvider: monaco.languages.CompletionItemProvider = {
    triggerCharacters: [' ', ':', '"', "'"],
    provideCompletionItems: async (model, position, _context, token) => {
      const value = getRunAsValue(model, position);
      if (!value || !directory.isEnabled()) return null;
      const suggestions: monaco.languages.CompletionItem[] = [];
      const seen = new Set<string>();
      for (const cursor of cursors) {
        const page = await directory.list(cursor);
        if (token.isCancellationRequested) return { suggestions: [] };
        if (!page) {
          cursors.splice(1);
          nextPage = undefined;
          return { suggestions: [] };
        }
        nextPage = page.nextPage;
        for (const account of page.serviceAccounts) {
          if (account.enabled && account.assumable && !seen.has(account.id)) {
            seen.add(account.id);
            suggestions.push({
              label: { label: account.name, description: account.id },
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
          command: { id: LOAD_MORE_SERVICE_ACCOUNTS, title: label },
        });
      }
      return { suggestions };
    },
  };

  const provideHover = async (
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ): Promise<monaco.languages.Hover | null> => {
    const value = getRunAsValue(model, position);
    if (!value?.id || !directory.isEnabled()) return null;
    const account = await directory.get(value.id);
    if (!account) return null;
    return {
      range: value.range,
      contents: [
        {
          value: [
            i18n.translate('workflows.editor.serviceAccountHoverDescription', {
              defaultMessage: '**Service account:** {name}\n\n**ID:** {id}',
              values: { name: escapeMarkdown(account.name), id: escapeMarkdown(account.id) },
            }),
            i18n.translate('workflows.editor.serviceAccountHoverRolesDescription', {
              defaultMessage: '**Roles:** {roles}',
              values: {
                roles: account.roles.length
                  ? i18n.formatList('unit', account.roles.map(escapeMarkdown))
                  : i18n.translate('workflows.editor.serviceAccountNoRolesLabel', {
                      defaultMessage: 'No roles assigned',
                    }),
              },
            }),
            i18n.translate('workflows.editor.serviceAccountHoverScopeDescription', {
              defaultMessage: '**Role scope:** {scope}',
              values: {
                scope: context.isServerless
                  ? i18n.translate('workflows.editor.serviceAccountProjectScopeLabel', {
                      defaultMessage: 'Current project',
                    })
                  : i18n.translate('workflows.editor.serviceAccountDeploymentScopeLabel', {
                      defaultMessage: 'This deployment',
                    }),
              },
            }),
            ...(context.isServerless && context.projectName
              ? [
                  i18n.translate('workflows.editor.serviceAccountHoverProjectDescription', {
                    defaultMessage: '**Project:** {name}',
                    values: { name: escapeMarkdown(context.projectName) },
                  }),
                ]
              : []),
            ...(context.isServerless && context.projectId
              ? [
                  i18n.translate('workflows.editor.serviceAccountHoverProjectIdDescription', {
                    defaultMessage: '**Project ID:** {id}',
                    values: { id: escapeMarkdown(context.projectId) },
                  }),
                ]
              : []),
            i18n.translate('workflows.editor.serviceAccountHoverStatusDescription', {
              defaultMessage: '**Status:** {enabled, select, true {Enabled} other {Disabled}}',
              values: { enabled: String(account.enabled) },
            }),
            i18n.translate('workflows.editor.serviceAccountHoverAssumableDescription', {
              defaultMessage:
                '**Kibana can assume this account:** {assumable, select, true {Yes} other {No}}',
              values: { assumable: String(account.assumable) },
            }),
          ].join('\n\n'),
          isTrusted: false,
          supportHtml: false,
        },
      ],
    };
  };

  const loadMore = (): void => {
    if (nextPage && !cursors.includes(nextPage)) cursors.push(nextPage);
  };

  return { completionProvider, provideHover, loadMore };
};
