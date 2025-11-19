/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import { useContentListConfig } from '../../context';
import { useContentListItems } from '../../state';
import type { ContentListItem } from '../../item';
import type { ContentEditorConfig } from './types';
import { useContentEditorOpener } from './content_editor_action_context';

/**
 * Hook that provides a function to open the content editor for an item.
 *
 * This hook is used internally by the table to auto-wire the "View details" action
 * when `features.contentEditor` is configured. It can also be used directly by consumers
 * who need custom control over when to open the content editor.
 *
 * The handler automatically:
 * - Opens the content editor flyout with the item's data.
 * - Determines readonly state based on `contentEditor.isReadonly` or falls back to `item.isManaged`.
 * - Refreshes the table data after save.
 * - Closes the flyout after successful save.
 *
 * @returns A function to open the content editor for an item, or `undefined` if
 *          content editor is not supported/configured.
 *
 * @example
 * ```tsx
 * // Custom usage (table auto-wires this automatically)
 * function MyComponent() {
 *   const openContentEditor = useOpenContentEditor();
 *
 *   return (
 *     <button onClick={() => openContentEditor?.(item)}>
 *       View Details
 *     </button>
 *   );
 * }
 * ```
 */
export const useOpenContentEditor = (): ((item: ContentListItem) => void) | undefined => {
  const { features, supports, entityName } = useContentListConfig();
  const openContentEditor = useContentEditorOpener();
  const { refetch } = useContentListItems();

  const contentEditorConfig: ContentEditorConfig | undefined =
    typeof features.contentEditor === 'object' ? features.contentEditor : undefined;

  const handler = useCallback(
    (item: ContentListItem) => {
      if (!contentEditorConfig || !openContentEditor) {
        return;
      }

      // Determine readonly state: use config function, fall back to isManaged.
      const isReadonly = contentEditorConfig.isReadonly?.(item) ?? item.isManaged ?? false;
      const readonlyReason = contentEditorConfig.readonlyReason?.(item);

      // Convert tags from string IDs to SavedObjectsReference format expected by content editor.
      const tagReferences = (item.tags ?? []).map((tagId) => ({
        type: 'tag' as const,
        id: tagId,
        name: `tag-${tagId}`,
      }));

      // Open the content editor flyout.
      const close = openContentEditor({
        item: {
          id: item.id,
          title: item.title,
          description: item.description,
          tags: tagReferences,
          createdAt: item.createdAt?.toISOString(),
          createdBy: item.createdBy,
          updatedAt: item.updatedAt?.toISOString(),
          updatedBy: item.updatedBy,
          managed: item.isManaged,
        },
        entityName,
        isReadonly,
        readonlyReason,
        customValidators: contentEditorConfig.customValidators,
        appendRows: contentEditorConfig.appendRows?.(item),
        onSave:
          contentEditorConfig.onSave &&
          (async (args) => {
            await contentEditorConfig.onSave!(args);
            await refetch();
            close();
          }),
      });
    },
    [contentEditorConfig, entityName, openContentEditor, refetch]
  );

  // Return undefined if content editor is not supported, not configured, or context is missing.
  if (!supports.contentEditor || !contentEditorConfig || !openContentEditor) {
    return undefined;
  }

  return handler;
};
