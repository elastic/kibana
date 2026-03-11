/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type { SerializableRecord, Serializable } from '@kbn/utility-types';

export interface LegacyEmbeddablePersistableStateItem {
  /**
   * A function which receives state and a list of references and should return
   * back the state with references injected. The default is an identity
   * function.
   *
   * @param state The persistable state serializable state object.
   * @param references List of saved object references.
   * @returns Persistable state object with references injected.
   */
  inject(
    state: EmbeddableStateWithType,
    references: SavedObjectReference[]
  ): EmbeddableStateWithType;

  /**
   * A function which receives state and should return the state with references
   * extracted and an array of the extracted references. The default case could
   * simply return the same state with an empty array of references.
   *
   * @param state The persistable state serializable state object.
   * @returns Persistable state object with references extracted and a list of
   *          references.
   */
  extract(state: EmbeddableStateWithType): {
    state: EmbeddableStateWithType;
    references: SavedObjectReference[];
  };

  /**
   * A list of migration functions, which migrate the persistable state
   * serializable object to the next version. Migration functions should be
   * keyed using semver, where the version indicates which version the state
   * will be migrated to.
   */
  migrations: MigrateFunctionsObject | GetMigrationFunctionObjectFn;
}

export interface EmbeddableStateWithType {
  type: string;
  enhancements?: SerializableRecord;
}

/**
 * migrate function runs the specified migration
 * @param state
 * @param version
 */
export type PersistableStateMigrateFn = (
  state: SerializableRecord,
  version: string
) => SerializableRecord;

export type GetMigrationFunctionObjectFn = () => MigrateFunctionsObject;

/**
 * Collection of migrations that a given type of persistable state object has
 * accumulated over time. Migration functions are keyed using semver version
 * of Kibana releases.
 */
export interface MigrateFunctionsObject {
  [semver: string]: MigrateFunction<any, any>;
}
export type MigrateFunction<
  FromVersion extends Serializable = SerializableRecord,
  ToVersion extends Serializable = SerializableRecord
> = (state: FromVersion) => ToVersion;
