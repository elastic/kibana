/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isFunction } from 'lodash';
import Semver from 'semver';
import type {
  SavedObjectMigration,
  SavedObjectsType,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core-saved-objects-server';
import { Logger } from '@kbn/logging';
import { MigrationLogger } from '../core/migration_logger';
import { maxVersion } from './pipelines/utils';
import { TransformSavedObjectDocumentError } from '../core/transform_saved_object_document_error';
import { type Transform, type TransformFn, TransformType } from './types';

const TRANSFORM_PRIORITY = [
  TransformType.Core,
  TransformType.Reference,
  TransformType.Convert,
  TransformType.Migrate,
];

/**
 * If a specific transform function fails, this tacks on a bit of information
 * about the document and transform that caused the failure.
 */
export function convertMigrationFunction(
  version: string,
  type: SavedObjectsType,
  migration: SavedObjectMigration,
  log: Logger
): TransformFn {
  const context = Object.freeze({
    log: new MigrationLogger(log),
    migrationVersion: version,
    convertToMultiNamespaceTypeVersion: type.convertToMultiNamespaceTypeVersion,
    isSingleNamespaceType: type.namespaceType === 'single',
  });

  return function tryTransformDoc(doc: SavedObjectUnsanitizedDoc) {
    try {
      const transformFn = isFunction(migration) ? migration : migration.transform;
      const result = transformFn(doc, context);

      // A basic check to help migration authors detect basic errors
      // (e.g. forgetting to return the transformed doc)
      if (!result || !result.type) {
        throw new Error(`Invalid saved object returned from migration ${type.name}:${version}.`);
      }

      return { transformedDoc: result, additionalDocs: [] };
    } catch (error) {
      log.error(`Error trying to transform document: ${error.message}`);
      throw new TransformSavedObjectDocumentError(error, version);
    }
  };
}

/**
 * Transforms are sorted in ascending order by version depending on their type:
 *  - `core` transforms always run first no matter version;
 *  - `reference` transforms have priority in case of the same version;
 *  - `convert` transforms run after in case of the same version;
 *  - 'migrate' transforms always run last.
 * This is because:
 *  1. 'convert' transforms get rid of the `namespace` field, which must be present for 'reference' transforms to function correctly.
 *  2. 'migrate' transforms are defined by the consumer, and may change the object type or `migrationVersion` which resets the migration loop
 *     and could cause any remaining transforms for this version to be skipped.One version may contain multiple transforms.
 */
export function transformComparator(a: Transform, b: Transform) {
  const aPriority = TRANSFORM_PRIORITY.indexOf(a.transformType);
  const bPriority = TRANSFORM_PRIORITY.indexOf(b.transformType);

  if (
    aPriority !== bPriority &&
    (a.transformType === TransformType.Core || b.transformType === TransformType.Core)
  ) {
    return aPriority - bPriority;
  }

  return Semver.compare(a.version, b.version) || aPriority - bPriority;
}

/**
 * Returns true if the given document has an higher version that the last known version, false otherwise
 */
export function downgradeRequired(
  doc: SavedObjectUnsanitizedDoc,
  latestVersions: Record<TransformType, string>,
  targetTypeVersion?: string
): boolean {
  const docTypeVersion = doc.typeMigrationVersion ?? doc.migrationVersion?.[doc.type];
  const latestMigrationVersion =
    targetTypeVersion ??
    maxVersion(latestVersions[TransformType.Migrate], latestVersions[TransformType.Convert]);

  if (!docTypeVersion || !latestMigrationVersion) {
    return false;
  }
  return Semver.gt(docTypeVersion, latestMigrationVersion);
}
