/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { findRefs } from './find_refs';
import { isLocalRef } from './is_local_ref';

/**
 * Finds local references
 */
export function findLocalRefs(obj: unknown): string[] {
  return findRefs(obj).filter((ref) => isLocalRef(ref));
}
