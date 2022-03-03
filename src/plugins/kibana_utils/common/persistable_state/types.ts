/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord, Serializable } from '@kbn/utility-types';
import { SavedObjectReference } from '../../../../core/types';

/**
 * Versioned state is a POJO JavaScript object that can be serialized to JSON,
 * and which also contains the version information. The version is stored in
 * semver format and corresponds to the Kibana release version when the object
 * was created. The version can be used to apply migrations to the object.
 *
 * For example:
 *
 * ```ts
 * const obj: VersionedState<{ dashboardId: string }> = {
 *   version: '7.14.0',
 *   state: {
 *     dashboardId: '123',
 *   },
 * };
 * ```
 */
export interface VersionedState<S extends Serializable = Serializable> {
  version: string;
  state: S;
}

/**
 * Persistable state interface can be implemented by something that persists
 * (stores) state, for example, in a saved object. Once implemented that thing
 * will gain ability to "extract" and "inject" saved object references, which
 * are necessary for various saved object tasks, such as export. It will also be
 * able to do state migrations across Kibana versions, if the shape of the state
 * would change over time.
 *
 * @todo Maybe rename it to `PersistableStateItem`?
 */
export interface PersistableState<P extends SerializableRecord = SerializableRecord> {
  /**
   * Function which reports telemetry information. This function is essentially
   * a "reducer" - it receives the existing "stats" object and returns an
   * updated version of the "stats" object.
   *
   * @param state The persistable state serializable state object.
   * @param stats Stats object containing the stats which were already
   *              collected. This `stats` object shall not be mutated in-line.
   * @returns A new stats object augmented with new telemetry information.
   */
  telemetry: (state: P, stats: Record<string, any>) => Record<string, any>;

  /**
   * A function which receives state and a list of references and should return
   * back the state with references injected. The default is an identity
   * function.
   *
   * @param state The persistable state serializable state object.
   * @param references List of saved object references.
   * @returns Persistable state object with references injected.
   */
  inject: (state: P, references: SavedObjectReference[]) => P;

  /**
   * A function which receives state and should return the state with references
   * extracted and an array of the extracted references. The default case could
   * simply return the same state with an empty array of references.
   *
   * @param state The persistable state serializable state object.
   * @returns Persistable state object with references extracted and a list of
   *          references.
   */
  extract: (state: P) => { state: P; references: SavedObjectReference[] };

  /**
   * A list of migration functions, which migrate the persistable state
   * serializable object to the next version. Migration functions should are
   * keyed by the Kibana version using semver, where the version indicates to
   * which version the state will be migrated to.
   */
  migrations: MigrateFunctionsObject | GetMigrationFunctionObjectFn;
}

export type GetMigrationFunctionObjectFn = () => MigrateFunctionsObject;

/**
 * Collection of migrations that a given type of persistable state object has
 * accumulated over time. Migration functions are keyed using semver version
 * of Kibana releases.
 */
export type MigrateFunctionsObject = { [semver: string]: MigrateFunction<any, any> };
export type MigrateFunction<
  FromVersion extends Serializable = SerializableRecord,
  ToVersion extends Serializable = SerializableRecord
> = (state: FromVersion) => ToVersion;

/**
 * migrate function runs the specified migration
 * @param state
 * @param version
 */
export type PersistableStateMigrateFn = (
  state: SerializableRecord,
  version: string
) => SerializableRecord;

export type PersistableStateDefinition<P extends SerializableRecord = SerializableRecord> = Partial<
  PersistableState<P>
>;

/**
 * @todo Add description.
 */
export interface PersistableStateService<P extends Serializable = Serializable> {
  /**
   * Function which reports telemetry information. This function is essentially
   * a "reducer" - it receives the existing "stats" object and returns an
   * updated version of the "stats" object.
   *
   * @param state The persistable state serializable state object.
   * @param stats Stats object containing the stats which were already
   *              collected. This `stats` object shall not be mutated in-line.
   * @returns A new stats object augmented with new telemetry information.
   */
  telemetry(state: P, collector: Record<string, any>): Record<string, any>;

  /**
   * A function which receives state and a list of references and should return
   * back the state with references injected. The default is an identity
   * function.
   *
   * @param state The persistable state serializable state object.
   * @param references List of saved object references.
   * @returns Persistable state object with references injected.
   */
  inject(state: P, references: SavedObjectReference[]): P;

  /**
   * A function which receives state and should return the state with references
   * extracted and an array of the extracted references. The default case could
   * simply return the same state with an empty array of references.
   *
   * @param state The persistable state serializable state object.
   * @returns Persistable state object with references extracted and a list of
   *          references.
   */
  extract(state: P): { state: P; references: SavedObjectReference[] };

  /**
   * A function which receives the state of an older object and version and
   * should migrate the state of the object to the latest possible version using
   * the `.migrations` dictionary provided on a {@link PersistableState} item.
   *
   * @param state The persistable state serializable state object.
   * @param version Current semver version of the `state`.
   * @returns A serializable state object migrated to the latest state.
   */
  migrateToLatest?: (state: VersionedState) => P;

  /**
   * returns all registered migrations
   */
  getAllMigrations: () => MigrateFunctionsObject;
}
