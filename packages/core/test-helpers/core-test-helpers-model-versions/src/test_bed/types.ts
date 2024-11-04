/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type {
  ISavedObjectsRepository,
  SavedObjectsBulkCreateObject,
} from '@kbn/core-saved-objects-api-server';

/**
 * A testbed that can be used for model version integration tests.
 *
 * @public
 */
export interface ModelVersionTestBed {
  /**
   * Starts the ES cluster.
   * This should usually be called only once before the suite runs, within a `beforeAll` block.
   */
  startES: () => Promise<void>;
  /**
   * Stops the ES cluster.
   * This should usually be called only after the suite runs, within a `afterAll` block.
   */
  stopES: () => Promise<void>;
  /**
   * Prepare and return the testkit instance.
   *
   * @see {@link ModelVersionTestkitOptions}
   * @see {@link ModelVersionTestKit}
   */
  prepareTestKit: (options: ModelVersionTestkitOptions) => Promise<ModelVersionTestKit>;
}

/**
 * Options used to create a {@link ModelVersionTestKit} via {@link ModelVersionTestBed#prepareTestKit}
 *
 * @public
 */
export interface ModelVersionTestkitOptions {
  /**
   * The {@link SavedObjectTestkitDefinition | definitions} for the SO type(s) to test
   */
  savedObjectDefinitions: SavedObjectTestkitDefinition[];
  /**
   * The path of the file to write logs to.
   * Necessary because the testkit doesn't know the test's location
   *
   * @example
   * ```ts
   * const logFilePath = Path.join(__dirname, '{my_test}.log');
   * ```
   */
  logFilePath: string;
  /**
   * (optional) if specified, the provided list of objects will be created (using `SOR.bulkCreate`)
   * between the first (before) the second (after) migrator runs. Objects are therefor expected to be of
   * the `versionBefore` version.
   */
  objectsToCreateBetween?: SavedObjectsBulkCreateObject[];
  /**
   * (optional) raw record of settings to be used to override the default Kibana configuration.
   * if provided, will be merged by the default test configuration.
   *
   * @example
   * ```
   * const settingOverrides = {
   *   migrations: {
   *     algorithm: 'zdt,
   *   }
   * }
   * ```
   */
  settingOverrides?: Record<string, any>;
  /**
   * (optional) allows to override the kibanaVersion that will be passed down to the migrator instances
   * Defaults to the version coming from the package.json.
   */
  kibanaVersion?: string;
  /**
   * (optional) allows to override the kibanaBranch that will be passed down to the migrator instances
   * Defaults to the version coming from the package.json.
   */
  kibanaBranch?: string;
  /**
   * (optional) the index (pattern) to use for all types.
   * Defaults to `.kibana_migrator_tests`
   */
  kibanaIndex?: string;
}

/**
 * Testkit composed of various services that can be used to run the
 * model version integration tests.
 *
 * Mostly composed of the two `repositoryBefore` and `repositoryAfter` repositories
 * that can be used to interact with different versions of the SO types.
 *
 * @public
 */
export interface ModelVersionTestKit {
  /**
   * An ES client connecting to the Elasticsearch cluster used by the testkit.
   */
  esClient: Client;
  /**
   * The SO repository using the SO type definitions at the `before` versions.
   */
  repositoryBefore: ISavedObjectsRepository;
  /**
   * The SO repository using the SO type definitions at the `after` versions.
   */
  repositoryAfter: ISavedObjectsRepository;
  /**
   * Cleanup function that will delete the test index.
   * Should be called before calling `testbed.prepareTestKit` again.
   */
  tearDown: () => Promise<void>;
}

/**
 * Represents the info necessary to prepare a given type for the sandbox.
 * Contains both the actual SO type definition, and the versions
 * that should be used at 'before' and 'after' model versions.
 *
 * @public
 */
export interface SavedObjectTestkitDefinition {
  /**
   * The SO type definition
   */
  definition: SavedObjectsType;
  /**
   * The model version to be used for the 'before' repository.
   */
  modelVersionBefore: number;
  /**
   * The model version to be used for the 'after' repository.
   */
  modelVersionAfter: number;
}
