/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Mirrors the `register()` call in
// `src/core/packages/user-storage/test/plugins/user_storage_test/server/plugin.ts`.
// Update both files together when changing the test fixture.

export const ALL_KEYS = [
  'test:string_key',
  'test:number_key',
  'test:object_key',
  'test:boolean_key',
  'test:array_key',
] as const;

export const DEFAULT_VALUES: Record<string, unknown> = {
  'test:string_key': 'default_value',
  'test:number_key': 42,
  'test:object_key': {
    theme: 'light',
    sidebar: { collapsed: false, width: 250 },
    pinnedItems: [],
  },
  'test:boolean_key': false,
  'test:array_key': [],
};
