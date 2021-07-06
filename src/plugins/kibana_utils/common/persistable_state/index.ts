/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mergeWith } from 'lodash';
import { SavedObjectReference } from '../../../../core/types';

export type SerializableValue = string | number | boolean | null | undefined | SerializableState;
export type Serializable = SerializableValue | SerializableValue[];

export type SerializableState = {
  [key: string]: Serializable;
};

export type MigrateFunction<
  FromVersion extends SerializableState = SerializableState,
  ToVersion extends SerializableState = SerializableState
> = (state: FromVersion) => ToVersion;

export type MigrateFunctionsObject = {
  [key: string]: MigrateFunction<any, any>;
};

export const mergeMigrationFunctionMaps = (
  obj1: MigrateFunctionsObject,
  obj2: MigrateFunctionsObject
) => {
  const customizer = (objValue: MigrateFunction, srcValue: MigrateFunction) => {
    if (!srcValue || !objValue) {
      return srcValue || objValue;
    }
    return (state: SerializableState) => objValue(srcValue(state));
  };

  return mergeWith({ ...obj1 }, obj2, customizer);
};

/**
 * migrate function runs the specified migration
 * @param state
 * @param version
 */
export type PersistableStateMigrateFn = (
  state: SerializableState,
  version: string
) => SerializableState;

export interface PersistableStateService<P extends SerializableState = SerializableState> {
  /**
   *  function to extract telemetry information
   * @param state
   * @param collector
   */
  telemetry: (state: P, collector: Record<string, any>) => Record<string, any>;
  /**
   * inject function receives state and a list of references and should return state with references injected
   * default is identity function
   * @param state
   * @param references
   */
  inject: (state: P, references: SavedObjectReference[]) => P;
  /**
   * extract function receives state and should return state with references extracted and array of references
   * default returns same state with empty reference array
   * @param state
   */
  extract: (state: P) => { state: P; references: SavedObjectReference[] };

  /**
   * migrateToLatest function receives state of older version and should migrate to the latest version
   * @param state
   * @param version
   */
  migrateToLatest?: (state: SerializableState, version: string) => P;

  /**
   * returns all registered migrations
   */
  getAllMigrations?: () => MigrateFunctionsObject;
}

export interface PersistableState<P extends SerializableState = SerializableState> {
  /**
   *  function to extract telemetry information
   * @param state
   * @param collector
   */
  telemetry: (state: P, collector: Record<string, any>) => Record<string, any>;
  /**
   * inject function receives state and a list of references and should return state with references injected
   * default is identity function
   * @param state
   * @param references
   */
  inject: (state: P, references: SavedObjectReference[]) => P;
  /**
   * extract function receives state and should return state with references extracted and array of references
   * default returns same state with empty reference array
   * @param state
   */
  extract: (state: P) => { state: P; references: SavedObjectReference[] };

  /**
   * list of all migrations per semver
   */
  migrations: MigrateFunctionsObject;
}

// the PersistableStateDefinition interface should be implemented by anything exposing SerializableState
export type PersistableStateDefinition<P extends SerializableState = SerializableState> = Partial<
  PersistableState<P>
>;
