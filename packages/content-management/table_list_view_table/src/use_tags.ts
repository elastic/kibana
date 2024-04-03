/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback, useMemo } from 'react';
import { Query } from '@elastic/eui';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { Tag } from './types';

type QueryUpdater = (query: Query, tag: Tag) => Query;

export function useTags({
  query,
  updateQuery,
  items,
}: {
  query: Query;
  updateQuery: (query: Query) => void;
  items: UserContentCommonSchema[];
}) {
  // Return a map of tag.id to an array of saved object ids having that tag
  // { 'abc-123': ['saved_object_id_1', 'saved_object_id_2', ...] }
  const tagsToTableItemMap = useMemo(() => {
    return items.reduce((acc, item) => {
      const tagReferences = item.references.filter((ref) => ref.type === 'tag');

      if (tagReferences.length > 0) {
        tagReferences.forEach((ref) => {
          if (!acc[ref.id]) {
            acc[ref.id] = [];
          }
          acc[ref.id].push(item.id);
        });
      }

      return acc;
    }, {} as { [tagId: string]: string[] });
  }, [items]);

  const updateTagClauseGetter = useCallback(
    (queryUpdater: QueryUpdater) =>
      (tag: Tag, q: Query = query, doUpdate: boolean = true) => {
        const updatedQuery = queryUpdater(q, tag);
        if (doUpdate) {
          updateQuery(updatedQuery);
        }
        return updatedQuery;
      },
    [query, updateQuery]
  );

  const hasTagInClauseGetter = useCallback(
    (matchValue: 'must' | 'must_not') => (tag: Tag, _query?: Query) => {
      const q = Boolean(_query) ? _query! : query;
      const tagsClauses = q.ast.getFieldClauses('tag');

      if (tagsClauses) {
        const mustHaveTagClauses = q.ast
          .getFieldClauses('tag')
          .find(({ match }) => match === matchValue)?.value as string[];

        if (mustHaveTagClauses && mustHaveTagClauses.includes(tag.name)) {
          return true;
        }
      }
      return false;
    },
    [query]
  );

  const addTagToIncludeClause = useMemo(
    () => updateTagClauseGetter((q, tag) => q.addOrFieldValue('tag', tag.name, true, 'eq')),
    [updateTagClauseGetter]
  );

  const removeTagFromIncludeClause = useMemo(
    () => updateTagClauseGetter((q, tag) => q.removeOrFieldValue('tag', tag.name)),
    [updateTagClauseGetter]
  );

  const addTagToExcludeClause = useMemo(
    () => updateTagClauseGetter((q, tag) => q.addOrFieldValue('tag', tag.name, false, 'eq')),
    [updateTagClauseGetter]
  );

  const removeTagFromExcludeClause = useMemo(
    () => updateTagClauseGetter((q, tag) => q.removeOrFieldValue('tag', tag.name)),
    [updateTagClauseGetter]
  );

  const hasTagInInclude = useMemo(() => hasTagInClauseGetter('must'), [hasTagInClauseGetter]);
  const hasTagInExclude = useMemo(() => hasTagInClauseGetter('must_not'), [hasTagInClauseGetter]);

  const addOrRemoveIncludeTagFilter = useCallback(
    (tag: Tag) => {
      let q: Query | undefined;

      // Remove the tag in the "Exclude" list if it is there
      if (hasTagInExclude(tag)) {
        q = removeTagFromExcludeClause(tag, undefined, false);
      } else if (hasTagInInclude(tag, q)) {
        // Already selected, remove the filter
        removeTagFromIncludeClause(tag, q);
        return;
      }
      addTagToIncludeClause(tag, q);
    },
    [
      hasTagInExclude,
      hasTagInInclude,
      removeTagFromExcludeClause,
      addTagToIncludeClause,
      removeTagFromIncludeClause,
    ]
  );

  const addOrRemoveExcludeTagFilter = useCallback(
    (tag: Tag) => {
      let q: Query | undefined;

      // Remove the tag in the "Include" list if it is there
      if (hasTagInInclude(tag)) {
        q = removeTagFromIncludeClause(tag, undefined, false);
      }

      if (hasTagInExclude(tag, q)) {
        // Already excluded, remove the filter
        removeTagFromExcludeClause(tag, q);
        return;
      }

      addTagToExcludeClause(tag, q);
    },
    [
      hasTagInInclude,
      hasTagInExclude,
      removeTagFromIncludeClause,
      addTagToExcludeClause,
      removeTagFromExcludeClause,
    ]
  );

  const clearTagSelection = useCallback(() => {
    const updatedQuery = query.removeOrFieldClauses('tag');
    updateQuery(updatedQuery);
    return updateQuery;
  }, [query, updateQuery]);

  return {
    addOrRemoveIncludeTagFilter,
    addOrRemoveExcludeTagFilter,
    clearTagSelection,
    tagsToTableItemMap,
  };
}
