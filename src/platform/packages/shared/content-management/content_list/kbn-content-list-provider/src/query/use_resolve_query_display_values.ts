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
import { USER_UID_FIELDS } from '../item';
import { useFieldDefinitions, buildSchema } from '../query_model';
import { useUserProfileStoreContext } from '../services';

/**
 * Fetch profiles for unresolved user-UID display values in the query bar.
 *
 * Scans all {@link USER_UID_FIELDS} (e.g. `createdBy`) in the parsed query
 * and delegates to `userProfileStore.resolveDisplayValues` (which calls
 * `suggest`). Once fetched, the store update triggers a field-definition
 * re-memo and the model re-derives so the filter applies on the next render.
 *
 * A `pendingRef` prevents re-requesting the same values across `fields`
 * changes to avoid an infinite suggest -> merge -> fields-change loop.
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

    const uidFieldNames = USER_UID_FIELDS.filter((name) =>
      fields.some((f) => f.fieldName === name)
    );
    if (uidFieldNames.length === 0) {
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

    const collectStringValues = (vals: unknown) => {
      for (const v of Array.isArray(vals) ? vals : [vals]) {
        if (typeof v === 'string' && v.length > 0) {
          displayValues.push(v);
        }
      }
    };

    for (const fieldName of uidFieldNames) {
      for (const must of [true, false]) {
        const orClause = parsed.ast.getOrFieldClause(fieldName, undefined, must, 'eq');
        if (orClause) {
          collectStringValues(orClause.value);
        }
      }

      try {
        const simpleClauses = parsed.ast.getFieldClauses(fieldName);
        if (simpleClauses) {
          for (const clause of simpleClauses) {
            collectStringValues(clause.value);
          }
        }
      } catch {
        // Non-fatal.
      }
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
