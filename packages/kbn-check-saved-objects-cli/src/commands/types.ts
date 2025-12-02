/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ListrTask } from 'listr2';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { Root } from '@kbn/core-root-server-internal';
import type { MigrationSnapshot } from '../types';
import type { TypeVersionFixtures } from '../migrations/fixtures/types';

export type Task = ListrTask<TaskContext>['task'];

export type FixtureMap = Record<string, TypeVersionFixtures>;

export interface TaskContext {
  gitRev: string;
  esServer?: TestElasticsearchUtils;
  kibanaServer?: Root;
  registeredTypes?: SavedObjectsType<any>[];
  from?: MigrationSnapshot;
  to?: MigrationSnapshot;
  updatedTypes: SavedObjectsType<any>[];
  currentRemovedTypes: string[];
  newRemovedTypes: string[];
  baselineMappings?: SavedObjectsTypeMappingDefinitions;
  fixtures: {
    previous: FixtureMap;
    current: FixtureMap;
  };
  test: boolean; // whether the script is running with TEST data
  fix: boolean;
}
