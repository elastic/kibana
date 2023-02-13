/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import type { Logger } from '@kbn/logging';
import type { ISavedObjectTypeRegistry, SavedObjectsType } from '@kbn/core-saved-objects-server';
import { type ActiveMigrations, type Transform, type TypeTransforms, TransformType } from './types';
import { getReferenceTransforms, getConversionTransforms } from './internal_transforms';
import { validateTypeMigrations } from './validate_migrations';
import { transformComparator, convertMigrationFunction } from './utils';
import { getModelVersionTransforms } from './model_version';

/**
 * Converts migrations from a format that is convenient for callers to a format that
 * is convenient for our internal usage:
 * From: { type: { version: fn } }
 * To:   { type: { latestVersion?: Record<TransformType, string>; transforms: [{ version: string, transform: fn }] } }
 */
export function buildActiveMigrations({
  typeRegistry,
  kibanaVersion,
  convertVersion,
  log,
}: {
  typeRegistry: ISavedObjectTypeRegistry;
  kibanaVersion: string;
  convertVersion?: string;
  log: Logger;
}): ActiveMigrations {
  const referenceTransforms = getReferenceTransforms(typeRegistry);

  return typeRegistry.getAllTypes().reduce((migrations, type) => {
    validateTypeMigrations({ type, kibanaVersion, convertVersion });

    const typeTransforms = buildTypeTransforms({
      type,
      log,
      kibanaVersion,
      referenceTransforms,
    });

    if (!typeTransforms.transforms.length) {
      return migrations;
    }

    return {
      ...migrations,
      [type.name]: typeTransforms,
    };
  }, {} as ActiveMigrations);
}

const buildTypeTransforms = ({
  type,
  log,
  referenceTransforms,
}: {
  type: SavedObjectsType;
  kibanaVersion: string;
  log: Logger;
  referenceTransforms: Transform[];
}): TypeTransforms => {
  const migrationsMap =
    typeof type.migrations === 'function' ? type.migrations() : type.migrations ?? {};

  const migrationTransforms = Object.entries(migrationsMap ?? {}).map<Transform>(
    ([version, transform]) => ({
      version,
      transform: convertMigrationFunction(version, type, transform, log),
      transformType: TransformType.Migrate,
    })
  );

  const modelVersionTransforms = getModelVersionTransforms({ log, typeDefinition: type });

  const conversionTransforms = getConversionTransforms(type);
  const transforms = [
    ...referenceTransforms,
    ...conversionTransforms,
    ...migrationTransforms,
    ...modelVersionTransforms,
  ].sort(transformComparator);

  return {
    latestVersion: _.chain(transforms)
      .groupBy('transformType')
      .mapValues((items) => _.last(items)?.version)
      .value() as Record<TransformType, string>,
    transforms,
  };
};
