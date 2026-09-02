/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComposerQuery } from '@elastic/esql';

const UNMAPPED_FIELDS_SETTING = 'unmapped_fields';

export type UnmappedFieldsPolicy = 'NULLIFY' | 'LOAD';

/**
 * Mutates `query` in place, like the `ComposerQuery` methods it wraps.
 *
 * `NULLIFY` makes columns missing from the resolved index pattern resolve to
 * null instead of failing ES|QL verification. See
 * https://github.com/elastic/kibana/issues/281060.
 */
export const applyUnmappedFieldsPolicy = (
  query: ComposerQuery,
  policy: UnmappedFieldsPolicy
): void => {
  // `addSetCommand` appends unconditionally, so drop any previous policy first.
  query.removeSetCommand(UNMAPPED_FIELDS_SETTING).addSetCommand(UNMAPPED_FIELDS_SETTING, policy);
};
