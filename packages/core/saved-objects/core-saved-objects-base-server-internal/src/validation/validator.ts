/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Semver from 'semver';
import type { Logger } from '@kbn/logging';
import type {
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
  // uses index meta's mappingVersions & docVersions -> virtualVersion to allow keeping track of mixed stack and model versions per type.
  /**
   * want to use the model virtual version if and only if the document has a switchToModelVersion
   * check if the type has a switchToModelVersionsAt and if that is equal to the version or the default.
   * if version is a valid model virtual versionvalid semver and if switchToModelVersionsAt === version, it is, then the docVersion can be a model version IF the docVersion is a valid modelVersion
   * @param document
   * @param version
   * @returns
   */
  public validate(document: SavedObjectSanitizedDoc, version?: string): void {
    // if a version is specified, use that
    let usedVersion = version;
    if (!usedVersion) {
      const docVersion =
        document.typeMigrationVersion ?? document.migrationVersion?.[document.type];
      if (docVersion) {
        // retain virtualModelVersion if one was set, otherwise if the latest migration wasn't a model migration, then the most recent migration the doc went through is older that the default and we use the default version.
        // only allow validation against versions > default if the version is a valid virtual model version.
        usedVersion =
          (Semver.gt(docVersion, this.defaultVersion) && isVirtualModelVersion(docVersion)) ||
          Semver.lt(docVersion, this.defaultVersion)
            ? docVersion
            : this.defaultVersion;
      } else {
        usedVersion = this.defaultVersion;
      }
    }
    const schemaVersion = previousVersionWithSchema(this.orderedVersions, usedVersion);
    // const docVersion =
    //   version ??
    //   document.typeMigrationVersion ??
    //   document.migrationVersion?.[document.type] ??
    //   this.defaultVersion;
    // const schemaVersion = previousVersionWithSchema(this.orderedVersions, docVersion);
    if (!schemaVersion || !this.validationMap[schemaVersion]) {
      return;
    }
    const validationRule = this.validationMap[schemaVersion];

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
