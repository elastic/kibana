/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo, useRef } from 'react';
import { Query } from '@elastic/eui';
import { useContentListState } from '../../state/use_content_list_state';
import { CONTENT_LIST_ACTIONS } from '../../state/types';
import { useFieldDefinitions, buildSchema } from '../../query_model';
import { TAG_FILTER_ID, CREATED_BY_FILTER_ID } from '../../datasource';

/**
 * Generic hook for toggling a value in any field filter via EUI Query mutations.
 *
 * Parses the current `queryText` → mutates the EUI Query → dispatches the
 * new text. Same pattern as `useFieldQueryFilter` in the toolbar, but works
 * from outside EuiSearchBar (e.g., avatar clicks, tag badge clicks).
 *
 * For known filters, prefer the convenience wrappers
 * {@link useTagFilterToggle} and {@link useCreatedByFilterToggle}.
 *
 * @param fieldName - The field name (e.g., `'tag'`, `'createdBy'`).
 * @returns A toggle callback `(id, type?) => void`.
 */
export const useFilterToggle = (fieldName: string) => {
  const { state, dispatch } = useContentListState();
  const { fields } = useFieldDefinitions();

  // Use a ref for queryText so the callback doesn't recreate on every keystroke.
  const queryTextRef = useRef(state.queryText);
  queryTextRef.current = state.queryText;

  const schema = useMemo(() => buildSchema(fields), [fields]);
  const field = useMemo(() => fields.find((f) => f.fieldName === fieldName), [fields, fieldName]);

  return useCallback(
    (id: string, type: 'include' | 'exclude' = 'include') => {
      const display = field?.resolveIdToDisplay(id) ?? id;
      const must = type === 'include';

      // Track whether the current queryText was parseable. If not, we cannot
      // inspect existing clauses (so toggle-off becomes a no-op for the
      // unparseable portion), but we must still preserve the original text
      // rather than silently discarding it.
      let q: InstanceType<typeof Query>;
      let parseError = false;
      try {
        q = Query.parse(queryTextRef.current, schema ? { schema } : undefined);
      } catch {
        q = Query.parse('');
        parseError = true;
      }

      // Check whether the exact requested polarity already exists.
      //
      // OR-field clauses (added programmatically via this hook) use an array
      // value; `getOrFieldClause` checks polarity via its `must` parameter.
      const existingOrSamePolarity = !!q.ast.getOrFieldClause(fieldName, display, must, 'eq');
      //
      // Simple field clauses (from manual typing: `field:value` or `-field:value`)
      // use a scalar value. `hasSimpleFieldClause` is polarity-agnostic, so use
      // `getSimpleFieldClause` to inspect the actual `match` property.
      const simpleClause = q.getSimpleFieldClause(fieldName, display);
      const simpleMatchesPolarity = simpleClause
        ? must
          ? simpleClause.match !== 'must_not' // undefined or 'must' both mean include
          : simpleClause.match === 'must_not'
        : false;

      // Remove all occurrences (polarity-agnostic).
      q = q.removeOrFieldValue(fieldName, display).removeSimpleFieldValue(fieldName, display);

      // Toggle off if the exact polarity was already present.
      // Flip or add if the clause was absent or had a different polarity.
      if (!existingOrSamePolarity && !simpleMatchesPolarity) {
        q = q.addOrFieldValue(fieldName, display, must, 'eq');
      }

      // When the original text was unparseable, prepend it so it is not lost.
      // The newly built clause is appended after it.
      const newQueryText = parseError
        ? [queryTextRef.current, q.text].filter(Boolean).join(' ')
        : q.text;

      dispatch({
        type: CONTENT_LIST_ACTIONS.SET_QUERY,
        payload: { queryText: newQueryText },
      });
    },
    [fieldName, field, schema, dispatch]
  );
};

/** Convenience wrapper around {@link useFilterToggle} for the `tag` field. */
export const useTagFilterToggle = () => useFilterToggle(TAG_FILTER_ID);

/** Convenience wrapper around {@link useFilterToggle} for the `createdBy` field. */
export const useCreatedByFilterToggle = () => useFilterToggle(CREATED_BY_FILTER_ID);
