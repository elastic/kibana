/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { normalizeAclSource, type StoredAcl } from '@kbn/ols';

/**
 * Reads the stored ACL of a raw saved object document, with the values Elasticsearch indexes for
 * it: the `acl` object, dotted root keys such as `"acl.owner.id"`, and arrays. It is the one place
 * in Core that reads the ACL from a document source, so every reader agrees with the index on what
 * the ACL grants.
 *
 * @param source The raw document source, with every root key, not only `acl`.
 * @returns The stored ACL, or `undefined` when the document has none.
 */
export const readStoredAcl = (
  source: Readonly<Record<string, unknown>> | undefined
): StoredAcl | undefined => normalizeAclSource(source);
