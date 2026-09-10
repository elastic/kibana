/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, type FC } from 'react';

import type { Tag } from '../types';
import { useServices } from '../services';

import { TagListComponent, type TagListComponentProps } from './tag_list.component';

/**
 * Props for the {@link TagList} component.
 */
export interface TagListProps extends Pick<TagListComponentProps, 'onClick'> {
  /** Array of tag IDs to resolve and display. */
  tagIds: string[];
}

/**
 * Connected component that renders a list of tags by resolving tag IDs to tag objects.
 *
 * This component uses the {@link useTagServices | useServices} hook to access the tag list
 * from context and resolves the provided tag IDs to full {@link Tag} objects. The resolved
 * tags are then rendered using {@link TagListComponent}.
 *
 * Must be used within a {@link ContentManagementTagsProvider} or {@link ContentManagementTagsKibanaProvider}.
 * If no provider is present, the component renders nothing.
 *
 * @returns The rendered tag list, or an empty {@link TagListComponent} if services are unavailable.
 *
 * @example
 * ```tsx
 * // Render tags for a saved object
 * <TagList
 *   tagIds={savedObject.attributes.tags}
 *   onClick={(tag, withModifier) => filterByTag(tag, withModifier)}
 * />
 * ```
 */
export const TagList: FC<TagListProps> = (props: TagListProps) => {
  const { tagIds, ...rest } = props;
  const services = useServices();

  const tags = useMemo(() => {
    if (!services?.getTagList || tagIds.length === 0) {
      return [];
    }

    const allTags = services.getTagList();
    const tagMap = new Map(
      allTags.filter((t): t is Tag & { id: string } => !!t.id).map((t) => [t.id, t])
    );

    // Preserve order from tagIds array, deduplicating any repeated IDs.
    const seen = new Set<string>();
    return tagIds
      .filter((id) => {
        if (seen.has(id)) {
          return false;
        }
        seen.add(id);
        return true;
      })
      .map((id) => tagMap.get(id))
      .filter((tag): tag is Tag & { id: string } => !!tag);
  }, [services, tagIds]);

  return <TagListComponent tags={tags} {...rest} />;
};
