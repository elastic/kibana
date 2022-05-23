/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectReference } from '@kbn/core/types';
import { mapValues } from 'lodash';
import {
  mergeMigrationFunctionMaps,
  MigrateFunctionsObject,
  VersionedState,
} from '@kbn/kibana-utils-plugin/common';
import type { QueryState } from './query_state';
import * as filtersPersistableState from './filters/persistable_state';

export const extract = (queryState: QueryState) => {
  const references: SavedObjectReference[] = [];

  const { state: updatedFilters, references: referencesFromFilters } =
    filtersPersistableState.extract(queryState.filters ?? []);
  references.push(...referencesFromFilters);

  return {
    state: {
      ...queryState,
      filters: updatedFilters,
    },
    references,
  };
};

export const inject = (queryState: QueryState, references: SavedObjectReference[]) => {
  const updatedFilters = filtersPersistableState.inject(queryState.filters ?? [], references);

  return {
    ...queryState,
    filters: updatedFilters,
  };
};

export const telemetry = (queryState: QueryState, collector: unknown) => {
  const filtersTelemetry = filtersPersistableState.telemetry(queryState.filters ?? [], collector);
  return {
    ...filtersTelemetry,
  };
};

export const migrateToLatest = ({ state, version }: VersionedState<QueryState>) => {
  const migratedFilters = filtersPersistableState.migrateToLatest({
    state: state.filters ?? [],
    version,
  });

  return {
    ...state,
    filters: migratedFilters,
  };
};

export const getAllMigrations = (): MigrateFunctionsObject => {
  const queryMigrations: MigrateFunctionsObject = {};

  const filterMigrations: MigrateFunctionsObject = mapValues(
    filtersPersistableState.getAllMigrations(),
    (migrate) => {
      return (state: QueryState) => ({
        ...state,
        filters: migrate(state.filters ?? []),
      });
    }
  );

  return mergeMigrationFunctionMaps(queryMigrations, filterMigrations);
};
