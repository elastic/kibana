/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectReference } from '../../../../core/types';

/**
 * Serializable state is something is a POJO JavaScript object that can be
 * serialized to a JSON string.
 */
export type SerializableState = {
  [key: string]: Serializable;
};
export type SerializableValue = string | number | boolean | null | undefined | SerializableState;
export type Serializable = SerializableValue | SerializableValue[];

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
export interface VersionedState<S extends SerializableState = SerializableState> {
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
export interface PersistableState<P extends SerializableState = SerializableState> {
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
  migrations: MigrateFunctionsObject;
}

/**
 * Collection of migrations that a given type of persistable state object has
 * accumulated over time. Migration functions are keyed using semver version
 * of Kibana releases.
 */
export type MigrateFunctionsObject = { [semver: string]: MigrateFunction };
export type MigrateFunction<
  FromVersion extends SerializableState = SerializableState,
  ToVersion extends SerializableState = SerializableState
> = (state: FromVersion) => ToVersion;

/**
 * @todo Shall we remove this?
 */
export type PersistableStateDefinition<P extends SerializableState = SerializableState> = Partial<
  PersistableState<P>
>;

/**
 * @todo Add description.
 */
export interface PersistableStateService<P extends SerializableState = SerializableState> {
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
   * Migrate function runs a specified migration of a {@link PersistableState}
   * item.
   *
   * When using this method it is up to consumer to make sure that the
   * migration function are executed in the right semver order. To avoid such
   * potentially error prone complexity, prefer using `migrateToLatest` method
   * instead.
   *
   * @param state The old persistable state serializable state object, which
   *              needs a migration.
   * @param version Semver version of the migration to execute.
   * @returns Persistable state object updated with the specified migration
   *          applied to it.
   */
  migrate(state: SerializableState, version: string): SerializableState;

  /**
   * A function which receives the state of an older object and version and
   * should migrate the state of the object to the latest possible version using
   * the `.migrations` dictionary provided on a {@link PersistableState} item.
   *
   * @param state The persistable state serializable state object.
   * @param version Current semver version of the `state`.
   * @returns A serializable state object migrated to the latest state.
   */
  migrateToLatest?: (state: VersionedState) => VersionedState<P>;
}
