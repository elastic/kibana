/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import type { SavedObjectReference } from '@kbn/core/types';
import type { MigrateFunctionsObject, VersionedState } from '@kbn/kibana-utils-plugin/common';
export declare const extract: (filters: Filter[]) => {
  state: Filter[];
  references: import('@kbn/core/server').SavedObjectReference[];
};
export declare const inject: (filters: Filter[], references: SavedObjectReference[]) => Filter[];
export declare const telemetry: (filters: Filter[], collector: unknown) => {};
export declare const migrateToLatest: (filters: VersionedState<Filter[]>) => Filter[];
export declare const getAllMigrations: () => MigrateFunctionsObject;
