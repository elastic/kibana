/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

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
  [key: string]: MigrateFunction;
};

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
   * migrate function runs the specified migration
   * @param state
   * @param version
   */
  migrate: (state: SerializableState, version: string) => SerializableState;
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

export type PersistableStateDefinition<P extends SerializableState = SerializableState> = Partial<
  PersistableState<P>
>;
