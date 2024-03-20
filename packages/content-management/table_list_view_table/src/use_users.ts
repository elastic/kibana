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
import { UserProfile } from '@kbn/security-plugin-types-common';

type QueryUpdater = (query: Query, user: UserProfile) => Query;

export function useUsers({
  query,
  updateQuery,
  items,
}: {
  query: Query;
  updateQuery: (query: Query) => void;
  items: UserContentCommonSchema[];
}) {
  const updateUserClauseGetter = useCallback(
    (queryUpdater: QueryUpdater) =>
      (user: UserProfile, q: Query = query, doUpdate: boolean = true) => {
        const updatedQuery = queryUpdater(q, user);
        if (doUpdate) {
          updateQuery(updatedQuery);
        }
        return updatedQuery;
      },
    [query, updateQuery]
  );

  const hasUserInClauseGetter = useCallback(
    (matchValue: 'must' | 'must_not') => (user: UserProfile, _query?: Query) => {
      const q = Boolean(_query) ? _query! : query;
      const usersClauses = q.ast.getFieldClauses('user');

      if (usersClauses) {
        const mustHaveTagClauses = q.ast
          .getFieldClauses('user')
          .find(({ match }) => match === matchValue)?.value as string[];

        if (mustHaveTagClauses && mustHaveTagClauses.includes(user.user.username)) {
          return true;
        }
      }
      return false;
    },
    [query]
  );

  const addUserToIncludeClause = useMemo(
    () =>
      updateUserClauseGetter((q, user) =>
        q.addOrFieldValue('user', user.user.username, true, 'eq')
      ),
    [updateUserClauseGetter]
  );

  const removeUserFromIncludeClause = useMemo(
    () => updateUserClauseGetter((q, user) => q.removeOrFieldValue('user', user.user.username)),
    [updateUserClauseGetter]
  );

  // const addTagToExcludeClause = useMemo(
  //   () => updateTagClauseGetter((q, tag) => q.addOrFieldValue('tag', tag.name, false, 'eq')),
  //   [updateTagClauseGetter]
  // );
  //
  // const removeTagFromExcludeClause = useMemo(
  //   () => updateTagClauseGetter((q, tag) => q.removeOrFieldValue('tag', tag.name)),
  //   [updateTagClauseGetter]
  // );

  const hasUserInInclude = useMemo(() => hasUserInClauseGetter('must'), [hasUserInClauseGetter]);
  const hasUserInExclude = useMemo(
    () => hasUserInClauseGetter('must_not'),
    [hasUserInClauseGetter]
  );

  const setUserSelection = useCallback(
    (users: UserProfile[]) => {
      let q: Query = query;
      q = q.removeOrFieldClauses('user');
      users.forEach((user) => {
        q = q.addOrFieldValue('user', user.user.username, true, 'eq');
      });
      updateQuery(q);
    },
    [query, updateQuery]
  );

  // const addOrRemoveExcludeTagFilter = useCallback(
  //   (tag: Tag) => {
  //     let q: Query | undefined;
  //
  //     // Remove the tag in the "Include" list if it is there
  //     if (hasTagInInclude(tag)) {
  //       q = removeTagFromIncludeClause(tag, undefined, false);
  //     }
  //
  //     if (hasTagInExclude(tag, q)) {
  //       // Already excluded, remove the filter
  //       removeTagFromExcludeClause(tag, q);
  //       return;
  //     }
  //
  //     addTagToExcludeClause(tag, q);
  //   },
  //   [
  //     hasTagInInclude,
  //     hasTagInExclude,
  //     removeTagFromIncludeClause,
  //     addTagToExcludeClause,
  //     removeTagFromExcludeClause,
  //   ]
  // );

  const clearUserSelection = useCallback(() => {
    const updatedQuery = query.removeOrFieldClauses('user');
    updateQuery(updatedQuery);
    return updateQuery;
  }, [query, updateQuery]);

  return {
    setUserSelection,
    // addOrRemoveExcludeTagFilter,
    clearUserSelection,
  };
}
