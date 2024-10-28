/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Semver from 'semver';
import type { Logger } from '@kbn/logging';
import type {
  SavedObjectsValidationSpec,
  SavedObjectsValidationMap,
  SavedObjectSanitizedDoc,
} from '@kbn/core-saved-objects-server';
import { createSavedObjectSanitizedDocSchema } from './schema';
import { isVirtualModelVersion } from '../model_version';

/**
 * Helper class that takes a {@link SavedObjectsValidationMap} and runs validations for a
 * given type based on the provided Kibana version.
 *
 * @internal
 */
export class SavedObjectsTypeValidator {
  private readonly log: Logger;
  private readonly type: string;
  private readonly defaultVersion: string;
  private readonly validationMap: SavedObjectsValidationMap;
  private readonly orderedVersions: string[];

  constructor({
    logger,
    type,
    validationMap,
    defaultVersion,
  }: {
    logger: Logger;
    type: string;
    validationMap: SavedObjectsValidationMap | (() => SavedObjectsValidationMap);
    defaultVersion: string;
  }) {
    this.log = logger;
    this.type = type;
    this.defaultVersion = defaultVersion;
    this.validationMap = typeof validationMap === 'function' ? validationMap() : validationMap;
    this.orderedVersions = Object.keys(this.validationMap).sort(Semver.compare);
  }

  public validate(document: SavedObjectSanitizedDoc): void {
    let usedVersion: string;
    const docVersion = document.typeMigrationVersion ?? document.migrationVersion?.[document.type];
    if (docVersion) {
      usedVersion = isVirtualModelVersion(docVersion) ? docVersion : this.defaultVersion;
    } else {
      usedVersion = this.defaultVersion;
    }
    const schemaVersion = previousVersionWithSchema(this.orderedVersions, usedVersion);

    let validationRule: SavedObjectsValidationSpec | undefined;
    if (schemaVersion && this.validationMap[schemaVersion]) {
      validationRule = this.validationMap[schemaVersion];
    }

    try {
      const validationSchema = createSavedObjectSanitizedDocSchema(validationRule);
      validationSchema.validate(document);
    } catch (e) {
      this.log.warn(
        `Error validating object of type [${this.type}] against version [${usedVersion}]`
      );
      throw e;
    }
  }
}

const previousVersionWithSchema = (
  orderedVersions: string[],
  targetVersion: string
): string | undefined => {
  for (let i = orderedVersions.length - 1; i >= 0; i--) {
    const currentVersion = orderedVersions[i];
    if (Semver.lte(currentVersion, targetVersion)) {
      return currentVersion;
    }
  }
  return undefined;
};
