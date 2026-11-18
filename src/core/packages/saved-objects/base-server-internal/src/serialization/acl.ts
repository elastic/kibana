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
 * Reads an object's stored ACL from its raw document source.
 *
 * It is the only reader of the `acl` field in Saved Objects. It reads every value Elasticsearch
 * indexes for the field, including dotted root keys such as `"acl.owner.id"`, so the result
 * matches what a search on the field matches.
 *
 * @param source The whole document source, with every root key, not only `acl`.
 * @returns The stored ACL, or `undefined` when no ACL field holds a value.
 */
export const readAclFromRawSource = (
  source: Readonly<Record<string, unknown>> | undefined
): StoredAcl | undefined => normalizeAclSource(source);
