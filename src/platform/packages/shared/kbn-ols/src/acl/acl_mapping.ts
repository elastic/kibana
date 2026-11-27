/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The Elasticsearch mapping of the root `acl` field. The rules for reading a stored ACL
 * assume this mapping: an object's ACL is read from the values that it indexes, and the read
 * filter searches the same values.
 *
 * Every stored value has to be indexed or rejected, so that reading one object and filtering a
 * search always decide on the same values. So the mapping sets neither `ignore_above` nor
 * `ignore_malformed`, and `version` doesn't coerce. Keys that the mapping doesn't define are
 * ignored (`dynamic: 'false'`), and `entries` is `nested`, so that the kind, ID, and access of one
 * entry are matched together.
 *
 * Changing this mapping: every Saved Objects index uses it as the root `acl` mapping, and Core
 * applies a change at startup without reindexing. v2 updates the mapping in place, and ZDT picks up
 * no documents for it. So:
 *
 * - Every change needs Core review and a restart and rollback plan. Once released, older Kibana
 *   versions compare this root mapping for exact equality, so even an additive change can cause a
 *   migration conflict on restart or rollback when the index also has newer model versions.
 * - Only additive changes are possible at all. An incompatible change stops Kibana from starting.
 * - Existing documents are not reindexed. A new field holds values only from writes made after it
 *   ships, and rewriting existing ACLs needs its own migration.
 * - Never write a field before a release maps it: readers ship one release before writers. An
 *   unmapped value is stored but not indexed, so `normalizeAclSource` would apply it while the
 *   read filter would not. `acl_mapping.test.ts` keeps the fields that `normalizeAclSource` reads in
 *   step with this mapping.
 */
export const ACL_MAPPING = {
  dynamic: 'false',
  properties: {
    version: { type: 'integer', coerce: false },
    owner: { properties: { type: { type: 'keyword' }, id: { type: 'keyword' } } },
    general: { properties: { access: { type: 'keyword' } } },
    entries: {
      type: 'nested',
      properties: {
        type: { type: 'keyword' },
        id: { type: 'keyword' },
        access: { type: 'keyword' },
        added_at: { type: 'date' },
      },
    },
  },
} as const;
