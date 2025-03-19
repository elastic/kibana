/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import Semver from 'semver';
import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { Transform, TransformType, TypeTransforms } from '../types';
import type { MigrationPipeline, MigrationPipelineResult } from './types';
import { applyVersion, assertValidCoreVersion } from './utils';

export class DocumentDowngradePipeline implements MigrationPipeline {
  private document: SavedObjectUnsanitizedDoc;
  private kibanaVersion: string;
  private originalDoc: SavedObjectUnsanitizedDoc;
  private typeTransforms: TypeTransforms;
  private targetTypeVersion: string;
  private targetCoreVersion?: string;

  constructor({
    document,
    kibanaVersion,
    typeTransforms,
    targetTypeVersion,
    targetCoreVersion,
  }: {
    document: SavedObjectUnsanitizedDoc;
    typeTransforms: TypeTransforms;
    kibanaVersion: string;
    targetTypeVersion: string;
    targetCoreVersion?: string;
  }) {
    this.originalDoc = document;
    this.kibanaVersion = kibanaVersion;
    this.document = cloneDeep(document);
    this.typeTransforms = typeTransforms;
    this.targetTypeVersion = targetTypeVersion;
    this.targetCoreVersion = targetCoreVersion;
  }

  run(): MigrationPipelineResult {
    assertValidCoreVersion({ document: this.document, kibanaVersion: this.kibanaVersion });
    this.assertCompatibility();

    for (const transform of this.getPendingTransforms()) {
      if (!transform.transformDown) {
        continue;
      }
      const { transformedDoc } = transform.transformDown(this.document);
      if (this.document.type !== this.originalDoc.type) {
        throw new Error(`Changing a document's type during a migration is not supported.`);
      }
      this.document = applyVersion({ document: transformedDoc, transform });
    }

    this.document = this.ensureVersion(this.document);
    this.document = this.applyVersionSchema(this.document);

    return {
      document: this.document,
      additionalDocs: [],
    };
  }

  private getPendingTransforms() {
    const { transforms } = this.typeTransforms;
    return transforms.reverse().filter((transform) => this.isPendingTransform(transform));
  }

  private isPendingTransform({ transformType, version }: Transform) {
    const { coreMigrationVersion, typeMigrationVersion } = this.document;

    switch (transformType) {
      // reference and convert type transforms were deprecated before downward conversion were a thing
      // so we will never need to revert such type of transforms (and they didn't implement a down conversion)
      case TransformType.Reference:
      case TransformType.Convert:
        return false;
      // including core transforms if targetCoreVersion is specified
      case TransformType.Core:
        return (
          this.targetCoreVersion &&
          (coreMigrationVersion == null ||
            Semver.gt(coreMigrationVersion, this.targetCoreVersion)) &&
          Semver.gt(version, this.targetCoreVersion)
        );
      // including migrate transforms between the targetTypeVersion and the typeMigrationVersion
      case TransformType.Migrate:
        return (
          (typeMigrationVersion == null || Semver.gte(typeMigrationVersion, version)) &&
          Semver.gt(version, this.targetTypeVersion)
        );
    }
  }

  /**
   * Verifies that the current document version is not greater than the version supported by Kibana.
   * And that the targetTypeVersion is not greater than the document's
   */
  private assertCompatibility() {
    const { typeMigrationVersion: currentVersion } = this.document;

    if (currentVersion && Semver.gt(this.targetTypeVersion, currentVersion)) {
      throw new Error(
        `Trying to transform down to a higher version: ${currentVersion} to ${this.targetTypeVersion}`
      );
    }
  }

  private ensureVersion({
    coreMigrationVersion: currentCoreMigrationVersion,
    typeMigrationVersion: currentTypeMigrationVersion,
    ...document
  }: SavedObjectUnsanitizedDoc) {
    const coreMigrationVersion = this.targetCoreVersion || currentCoreMigrationVersion;

    return {
      ...document,
      typeMigrationVersion: this.targetTypeVersion,
      ...(coreMigrationVersion ? { coreMigrationVersion } : {}),
    };
  }

  private applyVersionSchema(doc: SavedObjectUnsanitizedDoc): SavedObjectUnsanitizedDoc {
    const targetVersion = this.targetTypeVersion;
    const versionSchema = this.typeTransforms.versionSchemas[targetVersion];
    if (versionSchema) {
      return versionSchema(doc);
    }
    return doc;
  }
}
