/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import type { Logger } from '@kbn/logging';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import { type ActiveMigrations, type Transform, TransformType } from './types';
import { getReferenceTransforms, getConversionTransforms } from './internal_transforms';
import { validateMigrationsMapObject } from './validate_migrations';
import { transformComparator, wrapWithTry } from './utils';

/**
 * Converts migrations from a format that is convenient for callers to a format that
 * is convenient for our internal usage:
 * From: { type: { version: fn } }
 * To:   { type: { latestVersion?: Record<TransformType, string>; transforms: [{ version: string, transform: fn }] } }
 */
export function buildActiveMigrations(
  typeRegistry: ISavedObjectTypeRegistry,
  kibanaVersion: string,
  log: Logger
): ActiveMigrations {
  const referenceTransforms = getReferenceTransforms(typeRegistry);

  return typeRegistry.getAllTypes().reduce((migrations, type) => {
    const migrationsMap =
      typeof type.migrations === 'function' ? type.migrations() : type.migrations;
    validateMigrationsMapObject(type.name, kibanaVersion, migrationsMap);

    const migrationTransforms = Object.entries(migrationsMap ?? {}).map<Transform>(
      ([version, transform]) => ({
        version,
        transform: wrapWithTry(version, type, transform, log),
        transformType: TransformType.Migrate,
      })
    );
    const conversionTransforms = getConversionTransforms(type);
    const transforms = [
      ...referenceTransforms,
      ...conversionTransforms,
      ...migrationTransforms,
    ].sort(transformComparator);

    if (!transforms.length) {
      return migrations;
    }

    return {
      ...migrations,
      [type.name]: {
        latestVersion: _.chain(transforms)
          .groupBy('transformType')
          .mapValues((items) => _.last(items)?.version)
          .value() as Record<TransformType, string>,
        transforms,
      },
    };
  }, {} as ActiveMigrations);
}
