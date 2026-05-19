/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldDefinition, FlagDefinition } from './types';
/**
 * Hook that builds {@link FieldDefinition} and {@link FlagDefinition} arrays
 * from the services and support flags registered on the provider.
 *
 * Adding a new user-field filter only requires calling `makeUserFieldDefinition`
 * with the field name and the shared profile cache.
 */
export declare const useFieldDefinitions: () => {
  fields: FieldDefinition[];
  flags: FlagDefinition[];
  /**
   * Stable list of registered field names (e.g. `['tag', 'createdBy']`).
   *
   * Unlike `fields` (which updates when resolver functions change — e.g. the
   * profile cache loads data), `fieldNames` only changes when the *set* of
   * registered fields changes (feature flags toggled, services added/removed).
   * This keeps the search bar schema stable across async profile loading.
   */
  fieldNames: string[];
};
