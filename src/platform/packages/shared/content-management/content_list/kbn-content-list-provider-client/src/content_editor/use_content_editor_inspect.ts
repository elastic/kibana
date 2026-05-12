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
import type { ContentEditorConfig } from './types';

const MANAGED_READONLY_REASON = i18n.translate(
  'contentManagement.contentList.contentEditor.managedReadonlyReason',
  { defaultMessage: 'This item is managed by Kibana and cannot be edited.' }
);

/**
 * Creates an `onInspect` callback that opens the Kibana content editor flyout.
 *
 * This hook encapsulates all Kibana-specific content editor logic:
 * - Transforming `ContentListItem` to the content editor's `Item` shape
 * - Forcing managed items into read-only mode with an explanatory reason
 * - Wrapping `onSave` with query invalidation (to trigger refetch) and flyout close
 *
 * Returns `undefined` when `contentEditor` is not provided, so the base provider's
 * `item.onInspect` remains unset and the inspect action won't render.
 *
 * @internal Used by `ContentListClientProvider`.
 */
export const useContentEditorInspect = ({
  contentEditor,
  entityName,
  isReadOnly,
  queryKeyScope,
}: {
  contentEditor?: ContentEditorConfig;
  entityName: string;
  isReadOnly?: boolean;
  queryKeyScope: string;
}): ((item: ContentListItem) => void) | undefined => {
  const inspectItem = useCallback(
    (item: ContentListItem) => {
      if (!contentEditor) {
        return;
      }

      const { openContentEditor, onSave, isReadonly, customValidators, appendRows } = contentEditor;

      // Read-only by default: the flyout opens in view mode unless the consumer
      // explicitly opts in to editing by setting `isReadonly: false` AND providing
      // `onSave`. Managed items always force read-only regardless of config.
      // This matches the existing TableListView behavior and prevents a runtime
      // throw from useOpenContentEditor when onSave is absent.
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
    [contentEditor, entityName, isReadOnly, queryKeyScope]
  );

  return contentEditor ? inspectItem : undefined;
};
