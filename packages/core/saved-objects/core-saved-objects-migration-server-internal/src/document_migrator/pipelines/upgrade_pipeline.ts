/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import { cloneDeep } from 'lodash';
import Semver from 'semver';
import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { ActiveMigrations, Transform, TransformType } from '../types';
import type { MigrationPipeline, MigrationPipelineResult } from './types';
import {
  coreVersionTransformTypes,
  applyVersion,
  assertValidCoreVersion,
  maxVersion,
} from './utils';

function isGreater(a?: string, b?: string) {
  return !!a && (!b || Semver.gt(a, b));
}

export class DocumentUpgradePipeline implements MigrationPipeline {
  private additionalDocs = [] as SavedObjectUnsanitizedDoc[];
  private document: SavedObjectUnsanitizedDoc;
  private originalDoc: SavedObjectUnsanitizedDoc;
  private migrations: ActiveMigrations;
  private kibanaVersion: string;
  private convertNamespaceTypes: boolean;
  private targetTypeVersion: string;

  constructor({
    document,
    migrations,
    kibanaVersion,
    convertNamespaceTypes,
    targetTypeVersion,
  }: {
    document: SavedObjectUnsanitizedDoc;
    migrations: ActiveMigrations;
    kibanaVersion: string;
    convertNamespaceTypes: boolean;
    targetTypeVersion?: string;
  }) {
    this.originalDoc = document;
    this.document = cloneDeep(document);
    this.migrations = migrations;
    this.kibanaVersion = kibanaVersion;
    this.convertNamespaceTypes = convertNamespaceTypes;
    this.targetTypeVersion = targetTypeVersion || migrations[document.type]?.latestVersion.migrate;
  }

  protected *getPipeline(): Generator<Transform> {
    while (this.hasPendingTransforms()) {
      for (const transform of this.getPendingTransforms()) {
        yield transform;

        if (this.document.type !== this.originalDoc.type) {
          throw new Error(`Changing a document's type during a migration is not supported.`);
        }
      }
    }
  }

  private hasPendingTransforms() {
    const { coreMigrationVersion, typeMigrationVersion, type } = this.document;
    const latestVersion = this.migrations[type]?.latestVersion;

    if (isGreater(latestVersion?.core, coreMigrationVersion)) {
      return true;
    }

    if (typeMigrationVersion == null) {
      return false;
    }

    return (
      isGreater(this.targetTypeVersion, typeMigrationVersion) ||
      (this.convertNamespaceTypes && isGreater(latestVersion?.convert, typeMigrationVersion)) ||
      (this.convertNamespaceTypes && isGreater(latestVersion?.reference, coreMigrationVersion))
    );
  }

  private getPendingTransforms() {
    const { transforms } = this.migrations[this.document.type];

    return transforms.filter((transform) => this.isPendingTransform(transform));
  }

  private isPendingTransform({ transformType, version }: Transform) {
    const { coreMigrationVersion, typeMigrationVersion, type } = this.document;
    const latestVersion = this.migrations[type]?.latestVersion;

    switch (transformType) {
      case TransformType.Core:
        return isGreater(version, coreMigrationVersion);
      case TransformType.Reference:
        return (
          (this.convertNamespaceTypes || isGreater(latestVersion.core, coreMigrationVersion)) &&
          isGreater(version, coreMigrationVersion)
        );
      case TransformType.Convert:
        return (
          typeMigrationVersion != null &&
          this.convertNamespaceTypes &&
          isGreater(version, typeMigrationVersion)
        );
      case TransformType.Migrate:
        return (
          typeMigrationVersion != null &&
          isGreater(version, typeMigrationVersion) &&
          Semver.lte(version, this.targetTypeVersion)
        );
    }
  }

  /**
   * Verifies that the document version is not greater than the version supported by Kibana.
   * If we have a document with some version and no migrations available for this type,
   * the document belongs to a future version.
   */
  private assertCompatibility() {
    const { id, type, typeMigrationVersion: currentVersion } = this.document;
    const latestVersion = maxVersion(
      this.migrations[type]?.latestVersion.migrate,
      this.migrations[type]?.latestVersion.convert
    );

    if (isGreater(currentVersion, latestVersion)) {
      throw Boom.badData(
        `Document "${id}" belongs to a more recent version of Kibana [${currentVersion}] when the last known version is [${latestVersion}].`,
        this.document
      );
    }
  }

  /**
   * Transforms that remove or downgrade `typeMigrationVersion` properties are not allowed,
   * as this could get us into an infinite loop. So, we explicitly check for that here.
   */
  private assertUpgrade({ transformType, version }: Transform, previousVersion?: string) {
    if (coreVersionTransformTypes.includes(transformType)) {
      return;
    }

    const { typeMigrationVersion: currentVersion, type } = this.document;

    if (isGreater(previousVersion, currentVersion)) {
      throw new Error(
        `Migration "${type} v${version}" attempted to downgrade "typeMigrationVersion" from ${previousVersion} to ${currentVersion}.`
      );
    }
  }

  private ensureVersion({
    coreMigrationVersion: currentCoreMigrationVersion,
    typeMigrationVersion: currentTypeMigrationVersion,
    ...document
  }: SavedObjectUnsanitizedDoc) {
    const { type } = document;
    const latestVersion = this.migrations[type]?.latestVersion;
    const coreMigrationVersion =
      currentCoreMigrationVersion || maxVersion(latestVersion?.core, latestVersion?.reference);
    const typeMigrationVersion =
      currentTypeMigrationVersion || maxVersion(latestVersion?.migrate, latestVersion?.convert);

    return {
      ...document,
      ...(coreMigrationVersion ? { coreMigrationVersion } : {}),
      ...(typeMigrationVersion ? { typeMigrationVersion } : {}),
    };
  }

  run(): MigrationPipelineResult {
    assertValidCoreVersion({ document: this.document, kibanaVersion: this.kibanaVersion });

    for (const transform of this.getPipeline()) {
      const { typeMigrationVersion: previousVersion } = this.document;
      const { additionalDocs, transformedDoc } = transform.transform(this.document);
      this.document = transformedDoc;
      this.additionalDocs.push(...additionalDocs.map((document) => this.ensureVersion(document)));

      this.assertUpgrade(transform, previousVersion);
      this.document = applyVersion({ document: this.document, transform });
    }

    this.assertCompatibility();

    this.document = this.ensureVersion(this.document);

    return { document: this.document, additionalDocs: this.additionalDocs };
  }
}
