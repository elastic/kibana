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
        if (!acc[item.id]) {
          acc[item.id] = [];
        }
        acc[item.id].push(item.id);
      }

      return acc;
    }, {} as { [tagId: string]: string[] });
  }, [items]);

  const addIncludeTagFilter = useCallback(
    (tag: Tag) => {
      const query = searchQuery.query ?? initializeQuery();
      const updatedQuery = query.addOrFieldValue('tag', tag.name, true, 'eq');
      updateQuery(updatedQuery);
    },
    [searchQuery, initializeQuery, updateQuery]
  );

  const removeIncludeTagFilter = useCallback(
    (tag: { name: string }) => {
      const query = searchQuery.query ?? initializeQuery();
      const updatedQuery = query.removeOrFieldValue('tag', tag.name);
      updateQuery(updatedQuery);
    },
    [searchQuery, initializeQuery, updateQuery]
  );

  const addOrRemoveIncludeTagFilter = useCallback(
    (tag: Tag) => {
      const query = searchQuery.query ?? initializeQuery();
      const tagsClauses = query.ast.getFieldClauses('tag');

      if (tagsClauses) {
        const mustHaveTagClauses = query.ast
          .getFieldClauses('tag')
          .find(({ match }) => match === 'must')?.value as string[];

        if (mustHaveTagClauses && mustHaveTagClauses.includes(tag.name)) {
          // Already selected, remove the filter
          removeIncludeTagFilter(tag);
          return;
        }
      }

      addIncludeTagFilter(tag);
    },
    [searchQuery.query, initializeQuery, addIncludeTagFilter, removeIncludeTagFilter]
  );

  const addExcludeTagFilter = useCallback(
    (tag: Tag) => {
      const query = searchQuery.query ?? initializeQuery();

      const updatedQuery = query.addOrFieldValue('tag', tag.name, false, 'eq');
      updateQuery(updatedQuery);
    },
    [initializeQuery, searchQuery.query, updateQuery]
  );

  const removeExcludeTagFilter = useCallback(
    (tag: Tag) => {
      const query = searchQuery.query ?? initializeQuery();
      const updatedQuery = query.removeOrFieldValue('tag', tag.name);
      updateQuery(updatedQuery);
    },
    [searchQuery, initializeQuery, updateQuery]
  );

  const addOrRemoveExcludeTagFilter = useCallback(
    (tag: Tag) => {
      const query = searchQuery.query ?? initializeQuery();
      const tagsClauses = query.ast.getFieldClauses('tag');

      if (tagsClauses) {
        const mustHaveTagClauses = query.ast
          .getFieldClauses('tag')
          .find(({ match }) => match === 'must_not')?.value as string[];

        if (mustHaveTagClauses && mustHaveTagClauses.includes(tag.name)) {
          // Already selected, remove the filter
          removeExcludeTagFilter(tag);
          return;
        }
      }

      addExcludeTagFilter(tag);
    },
    [searchQuery.query, initializeQuery, addExcludeTagFilter, removeExcludeTagFilter]
  );

  return {
    addOrRemoveIncludeTagFilter,
    addOrRemoveExcludeTagFilter,
    tagsToTableItemMap,
  };
}
