/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';
import { Query } from '@elastic/eui';
import { useFieldDefinitions, buildSchema } from '../query_model';
import { useUserProfileStoreContext } from '../services';

/**
 * Fetch profiles for unresolved `createdBy:` display values in the query bar.
 *
 * Delegates to `userProfileStore.resolveDisplayValues` (which calls `suggest`).
 * Once fetched, the store update triggers a field-definition re-memo and the
 * model re-derives so the filter applies on the next render.
 *
 * A `pendingRef` prevents re-requesting the same values across `fields`
 * changes to avoid an infinite suggest → merge → fields-change loop.
 *
 * Client-backed lists strip `suggest`, making this hook a no-op for them;
 * their profiles are primed from the known item universe instead.
 */
export const useResolveQueryDisplayValues = (queryText: string): void => {
  const userProfileStore = useUserProfileStoreContext();
  const { fields } = useFieldDefinitions();
  const resolveDisplayValues = userProfileStore?.resolveDisplayValues;

  // Track display values already submitted for resolution to prevent
  // re-requesting on every `fields` change (which occurs after each
  // profile cache update). Cleared when `queryText` changes since the
  // user may have typed a new value.
  const pendingRef = useRef<Set<string>>(new Set());
  const prevQueryTextRef = useRef(queryText);
  if (prevQueryTextRef.current !== queryText) {
    prevQueryTextRef.current = queryText;
    pendingRef.current = new Set();
  }

  useEffect(() => {
    if (!resolveDisplayValues) {
      return;
    }
    const createdByField = fields.find((f) => f.fieldName === 'createdBy');
    if (!createdByField) {
      return;
    }

    const schema = buildSchema(fields);
    let parsed: InstanceType<typeof Query>;
    try {
      parsed = Query.parse(queryText, schema ? { schema } : undefined);
    } catch {
      return;
    }

    const displayValues: string[] = [];

    const collectOrValues = (must: boolean) => {
      const clause = parsed.ast.getOrFieldClause('createdBy', undefined, must, 'eq');
      if (clause) {
        const vals = Array.isArray(clause.value) ? clause.value : [clause.value];
        for (const v of vals) {
          if (typeof v === 'string' && v.length > 0) {
            displayValues.push(v);
          }
        }
      }
    };
    collectOrValues(true);
    collectOrValues(false);

    // Also check simple field clauses (e.g. `createdBy:email` without parens).
    try {
      const simpleClauses = parsed.ast.getFieldClauses('createdBy');
      if (simpleClauses) {
        for (const clause of simpleClauses) {
          const vals = Array.isArray(clause.value) ? clause.value : [clause.value];
          for (const v of vals) {
            if (typeof v === 'string' && v.length > 0) {
              displayValues.push(v);
            }
          }
        }
      }
    } catch {
      // Non-fatal.
    }

    const uniqueValues = [...new Set(displayValues)];
    const newValues = uniqueValues.filter((v) => !pendingRef.current.has(v));
    if (newValues.length > 0) {
      for (const v of newValues) {
        pendingRef.current.add(v);
      }
      resolveDisplayValues(newValues);
    }
  }, [queryText, fields, resolveDisplayValues]);
};
