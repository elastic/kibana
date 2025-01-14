/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Semver from 'semver';
import Boom from '@hapi/boom';
import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { type Transform, TransformType } from '../types';

/** transform types using `coreMigrationVersion` and not `typeMigrationVersion` */
export const coreVersionTransformTypes = [TransformType.Core, TransformType.Reference];

/**
 * Apply the version of the given {@link Transform | transform} to the given {@link SavedObjectUnsanitizedDoc | document}.
 * Will update `coreMigrationVersion` or `typeMigrationVersion` depending on the type of the transform.
 */
export const applyVersion = ({
  document,
  transform,
}: {
  document: SavedObjectUnsanitizedDoc;
  transform: Transform;
}): SavedObjectUnsanitizedDoc => {
  return {
    ...document,
    ...(coreVersionTransformTypes.includes(transform.transformType)
      ? { coreMigrationVersion: transform.version }
      : { typeMigrationVersion: transform.version }),
  };
};

/**
 * Asserts the document's core version is valid and not greater than the current Kibana version.
 * Hence, the object does not belong to a more recent version of Kibana.
 */
export const assertValidCoreVersion = ({
  kibanaVersion,
  document,
}: {
  document: SavedObjectUnsanitizedDoc;
  kibanaVersion: string;
}) => {
  const { id, coreMigrationVersion } = document;
  if (!coreMigrationVersion) {
    return;
  }

  if (!Semver.valid(coreMigrationVersion)) {
    throw Boom.badData(
      `Document "${id}" has an invalid "coreMigrationVersion" [${coreMigrationVersion}]. This must be a semver value.`,
      document
    );
  }

  if (Semver.gt(coreMigrationVersion, kibanaVersion)) {
    throw Boom.badData(
      `Document "${id}" has a "coreMigrationVersion" which belongs to a more recent version` +
        ` of Kibana [${coreMigrationVersion}]. The current version is [${kibanaVersion}].`,
      document
    );
  }
};

export function maxVersion(a?: string, b?: string) {
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }

  return Semver.gt(a, b) ? a : b;
}
