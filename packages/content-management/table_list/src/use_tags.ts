/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useCallback, useMemo } from 'react';
import { Query, Ast } from '@elastic/eui';

import type { Tag } from './types';
import type { State, UserContentCommonSchema } from './table_list_view';

type QueryUpdater = (query: Query, tag: Tag) => Query;

export function useTags({
  searchQuery,
  updateQuery,
  items,
}: {
  searchQuery: State['searchQuery'];
  updateQuery: (query: Query) => void;
  items: UserContentCommonSchema[];
}) {
  const initializeQuery = useCallback(() => {
    const ast = Ast.create([]);
    return new Query(ast, undefined, searchQuery.text);
  }, [searchQuery]);

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
      (tag: Tag, q?: Query, doUpdate: boolean = true) => {
        const query = q !== undefined ? q : searchQuery.query ?? initializeQuery();
        const updatedQuery = queryUpdater(query, tag);
        if (doUpdate) {
          updateQuery(updatedQuery);
        }
        return updatedQuery;
      },
    [searchQuery.query, initializeQuery, updateQuery]
  );

  const hasTagInClauseGetter = useCallback(
    (matchValue: 'must' | 'must_not') => (tag: Tag, _query?: Query) => {
      const query = Boolean(_query) ? _query! : searchQuery.query ?? initializeQuery();
      const tagsClauses = query.ast.getFieldClauses('tag');

      if (tagsClauses) {
        const mustHaveTagClauses = query.ast
          .getFieldClauses('tag')
          .find(({ match }) => match === matchValue)?.value as string[];

        if (mustHaveTagClauses && mustHaveTagClauses.includes(tag.name)) {
          return true;
        }
      }
      return false;
    },
    [searchQuery.query, initializeQuery]
  );

  const addTagToIncludeClause = useMemo(
    () => updateTagClauseGetter((query, tag) => query.addOrFieldValue('tag', tag.name, true, 'eq')),
    [updateTagClauseGetter]
  );

  const removeTagFromIncludeClause = useMemo(
    () => updateTagClauseGetter((query, tag) => query.removeOrFieldValue('tag', tag.name)),
    [updateTagClauseGetter]
  );

  const addTagToExcludeClause = useMemo(
    () =>
      updateTagClauseGetter((query, tag) => query.addOrFieldValue('tag', tag.name, false, 'eq')),
    [updateTagClauseGetter]
  );

  const removeTagFromExcludeClause = useMemo(
    () => updateTagClauseGetter((query, tag) => query.removeOrFieldValue('tag', tag.name)),
    [updateTagClauseGetter]
  );

  const hasTagInInclude = useMemo(() => hasTagInClauseGetter('must'), [hasTagInClauseGetter]);
  const hasTagInExclude = useMemo(() => hasTagInClauseGetter('must_not'), [hasTagInClauseGetter]);

  const addOrRemoveIncludeTagFilter = useCallback(
    (tag: Tag) => {
      let query: Query | undefined;

      // Remove the tag in the "Exclude" list if it is there
      if (hasTagInExclude(tag)) {
        query = removeTagFromExcludeClause(tag, undefined, false);
      }

      if (hasTagInInclude(tag, query)) {
        // Already selected, remove the filter
        removeTagFromIncludeClause(tag, query);
        return;
      }
      addTagToIncludeClause(tag, query);
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
      let query: Query | undefined;

      // Remove the tag in the "Include" list if it is there
      if (hasTagInInclude(tag)) {
        query = removeTagFromIncludeClause(tag, undefined, false);
      }

      if (hasTagInExclude(tag, query)) {
        // Already selected, remove the filter
        removeTagFromExcludeClause(tag, query);
        return;
      }

      addTagToExcludeClause(tag, query);
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
    if (!searchQuery.query) {
      return;
    }
    const updatedQuery = searchQuery.query.removeOrFieldClauses('tag');
    updateQuery(updatedQuery);
    return updateQuery;
  }, [searchQuery.query, updateQuery]);

  return {
    addOrRemoveIncludeTagFilter,
    addOrRemoveExcludeTagFilter,
    clearTagSelection,
    tagsToTableItemMap,
  };
}
