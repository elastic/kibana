/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useCallback } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { TagList, type Tag } from '@kbn/content-management-tags';
import { useTagFilterToggle } from '@kbn/content-list-provider';

export interface NameCellTagsProps {
  /** Tag IDs to render. */
  tagIds: string[];
  /**
   * Optional override for the tag click handler.
   * When omitted, the built-in handler toggles include/exclude
   * filters via {@link useTagFilterToggle}.
   */
  onTagClick?: (tag: Tag, withModifierKey: boolean) => void;
}

/**
 * Renders tag badges below the title/description in the name cell.
 *
 * Provides a built-in click handler that toggles tag filters on the
 * content list state:
 * - **Click**: toggles the tag as an include filter.
 * - **Modifier+click** (Cmd on macOS, Ctrl on Windows/Linux): toggles
 *   the tag as an exclude filter.
 *
 * Consumers can override this behavior via the `onTagClick` prop.
 */
export const NameCellTags = memo(function NameCellTags({ tagIds, onTagClick }: NameCellTagsProps) {
  const toggleTag = useTagFilterToggle();

  const handleTagClick = useCallback(
    (tag: Tag, withModifierKey: boolean) => {
      if (onTagClick) {
        onTagClick(tag, withModifierKey);
        return;
      }

      if (tag.id) {
        toggleTag(tag.id, tag.name, withModifierKey);
      }
    },
    [toggleTag, onTagClick]
  );

  if (tagIds.length === 0) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="xs" />
      <TagList tagIds={tagIds} onClick={handleTagClick} />
    </>
  );
});
