/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import compare from 'semver/functions/compare';

import { migrateToLatest } from '@kbn/kibana-utils-plugin/common';
import { EmbeddableFactory, EmbeddableInput } from '../embeddables';

/**
 * A helper function that migrates an Embeddable Input to its latest version. Note that this function
 * only runs the embeddable factory's migrations.
 */
export const runEmbeddableFactoryMigrations = <ToType extends EmbeddableInput>(
  initialInput: { version?: string },
  factory: { migrations?: EmbeddableFactory['migrations']; latestVersion?: string }
): { input: ToType; migrationRun: boolean } => {
  if (!factory.latestVersion) {
    return { input: initialInput as unknown as ToType, migrationRun: false };
  }

  // any embeddable with no version set is considered to require all clientside migrations so we default to 0.0.0
  const inputVersion = initialInput.version ?? '0.0.0';
  const migrationRun = compare(inputVersion, factory.latestVersion, true) !== 0;

  // return early to avoid extra operations when there are no migrations to run.
  if (!migrationRun) return { input: initialInput as unknown as ToType, migrationRun };

  const factoryMigrations =
    typeof factory?.migrations === 'function' ? factory?.migrations() : factory?.migrations || {};
  const migratedInput = migrateToLatest(
    factoryMigrations ?? {},
    {
      state: cloneDeep(initialInput),
      version: inputVersion,
    },
    true
  );
  migratedInput.version = factory.latestVersion;
  return { input: migratedInput as ToType, migrationRun };
};
