/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StoredLinksByValueState910, StoredLinksByValueState930, LegacyState } from './types';

export function isLegacyState(state: object): state is LegacyState {
  return is910State(state) || is930State(state);
}

export function is910State(state: object): state is StoredLinksByValueState910 {
  return 'attributes' in state;
}

export function is930State(state: object): state is StoredLinksByValueState930 {
  if (!Array.isArray((state as StoredLinksByValueState930).links)) return false;
  return Boolean((state as StoredLinksByValueState930).links?.some((link) => 'order' in link));
}
