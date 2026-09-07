/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  contentListKeys,
  contentListQueryClient,
  type ContentListItem,
} from '@kbn/content-list-provider';
import type { OpenContentEditorParams } from '@kbn/content-management-content-editor';
import type { ContentEditorConfig } from './types';

const MANAGED_READONLY_REASON = i18n.translate(
  'contentManagement.contentList.contentEditor.managedReadonlyReason',
  { defaultMessage: 'This item is managed by Kibana and cannot be edited.' }
);

/**
 * Builds the per-item callback for `features.contentEditor.open` by wrapping
 * `openContentEditor` (from `useOpenContentEditor()`) with the consumer's
 * {@link ContentEditorConfig}. Returns `undefined` when no config is supplied
 * so `<Action.ContentEditor />` self-skips.
 *
 * @internal Used by `ContentListClientProvider`.
 */
export const useContentEditorOpen = ({
  contentEditor,
  openContentEditor,
  entityName,
  isReadOnly,
  queryKeyScope,
}: {
  contentEditor?: ContentEditorConfig;
  openContentEditor: (params: OpenContentEditorParams) => () => void;
  entityName: string;
  isReadOnly?: boolean;
  queryKeyScope: string;
}): ((item: ContentListItem) => void) | undefined => {
  const open = useCallback(
    (item: ContentListItem) => {
      if (!contentEditor) {
        return;
      }

      const { onSave, isReadonly, customValidators, appendRows } = contentEditor;

      // Read-only unless the consumer opts in (`isReadonly: false` + `onSave`).
      // Managed items always force read-only — matches TableListView and avoids
      // a runtime throw from useOpenContentEditor when `onSave` is absent.
      const itemIsReadonly = item.managed || isReadonly !== false || isReadOnly || !onSave;

      const close = openContentEditor({
        item: {
          id: item.id,
          title: item.title,
          description: item.description,
          tags: item.tags ?? [],
          createdAt: item.createdAt,
          createdBy: item.createdBy,
          updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt,
          updatedBy: item.updatedBy,
          managed: item.managed,
        },
        entityName,
        isReadonly: itemIsReadonly,
        ...(item.managed && { readonlyReason: MANAGED_READONLY_REASON }),
        customValidators,
        onSave:
          !itemIsReadonly && onSave
            ? async (args) => {
                await onSave(args);
                contentListQueryClient.invalidateQueries({
                  queryKey: contentListKeys.all(queryKeyScope),
                });
                close();
              }
            : undefined,
        appendRows: appendRows ? appendRows(item) : undefined,
      });
    },
    [contentEditor, openContentEditor, entityName, isReadOnly, queryKeyScope]
  );

  return contentEditor ? open : undefined;
};
