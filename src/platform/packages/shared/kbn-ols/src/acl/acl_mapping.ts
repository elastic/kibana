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
