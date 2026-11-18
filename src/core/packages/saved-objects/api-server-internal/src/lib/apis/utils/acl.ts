/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StoredAcl } from '@kbn/ols';

/**
 * Leaves an object's stored ACL out of a repository result, unless the caller asked for it with
 * `includeAcl`. The two converters from raw documents call it, so it is the only place that decides
 * whether a result carries an ACL.
 *
 * @param object A saved object converted from a raw document, with its stored ACL if it has one.
 * @param includeAcl Whether the caller asked for the ACL.
 * @returns The object, without `acl` unless `includeAcl` is set.
 */
export const projectAcl = <O extends { acl?: StoredAcl }>(object: O, includeAcl = false): O => {
  if (includeAcl || !('acl' in object)) {
    return object;
  }
  const { acl, ...withoutAcl } = object;
  return withoutAcl as O;
};
