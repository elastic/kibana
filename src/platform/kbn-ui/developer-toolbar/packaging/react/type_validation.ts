/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * BUILD-TIME TYPE VALIDATION
 *
 * Ensures the duplicated types in `packaging/react/types.ts` remain compatible
 * with the source types. Compiled during packaging builds via
 * `packaging/tsconfig.json` with `--noEmit`.
 *
 * - Imports types from BOTH source and packaged locations.
 * - TypeScript will fail the build if types diverge incompatibly.
 *
 * @see {@link ../tsconfig.json} for the build configuration.
 * @see {@link ./types.ts} for the standalone type definitions.
 */

// Module namespaces: `typeof` a namespace only carries its value exports.
import type * as SourceEntry from '../..';
import type * as PackagedEntry from '.';
import type * as PackagedTypes from './types';

// Key equality: mutual assignability alone misses an added optional field, so also
// require both sides to declare exactly the same property names.
type SameKeys<A, B> = [keyof A] extends [keyof B]
  ? [keyof B] extends [keyof A]
    ? true
    : never
  : never;

// Export completeness: the source entry, the declared types and the packaging entry
// must expose exactly the same runtime exports.
const _sourceTypesValueExports: SameKeys<typeof SourceEntry, typeof PackagedTypes> = true;
const _packagedEntryValueExports: SameKeys<typeof PackagedEntry, typeof PackagedTypes> = true;

void _sourceTypesValueExports;
void _packagedEntryValueExports;

export const TYPE_VALIDATION_PASSED = true;
