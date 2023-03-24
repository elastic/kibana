/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Boom from '@hapi/boom';
import Semver from 'semver';
import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { ActiveMigrations, Transform, TransformType } from './types';
import { maxVersion } from './utils';

function isGreater(a?: string, b?: string) {
  return !!a && (!b || Semver.gt(a, b));
}

export class DocumentMigratorPipeline {
  additionalDocs = [] as SavedObjectUnsanitizedDoc[];

  constructor(
    public document: SavedObjectUnsanitizedDoc,
    private migrations: ActiveMigrations,
    private kibanaVersion: string,
    private convertNamespaceTypes: boolean
  ) {}

  protected *getPipeline(): Generator<Transform> {
    while (this.hasPendingTransforms()) {
      const { type } = this.document;

      for (const transform of this.getPendingTransforms()) {
        yield transform;

        if (type !== this.document.type) {
          // In the initial implementation, all the transforms for the new type should be applied.
          // And at the same time, documents with `undefined` in `typeMigrationVersion` are treated as the most recent ones.
          // This is a workaround to get into the loop again and apply all the migrations for the new type.
          this.document.typeMigrationVersion = '';
          break;
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
      isGreater(latestVersion?.migrate, typeMigrationVersion) ||
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
        return typeMigrationVersion != null && isGreater(version, typeMigrationVersion);
    }
  }

  /**
   * Asserts the object's core version is valid and not greater than the current Kibana version.
   * Hence, the object does not belong to a more recent version of Kibana.
   */
  private assertValidity() {
    const { id, coreMigrationVersion } = this.document;
    if (!coreMigrationVersion) {
      return;
    }

    if (!Semver.valid(coreMigrationVersion)) {
      throw Boom.badData(
        `Document "${id}" has an invalid "coreMigrationVersion" [${coreMigrationVersion}]. This must be a semver value.`,
        this.document
      );
    }

    if (Semver.gt(coreMigrationVersion, this.kibanaVersion)) {
      throw Boom.badData(
        `Document "${id}" has a "coreMigrationVersion" which belongs to a more recent version` +
          ` of Kibana [${coreMigrationVersion}]. The current version is [${this.kibanaVersion}].`,
        this.document
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
    if ([TransformType.Core, TransformType.Reference].includes(transformType)) {
      return;
    }

    const { typeMigrationVersion: currentVersion, type } = this.document;

    if (isGreater(previousVersion, currentVersion)) {
      throw new Error(
        `Migration "${type} v${version}" attempted to downgrade "typeMigrationVersion" from ${previousVersion} to ${currentVersion}.`
      );
    }
  }

  private bumpVersion({ transformType, version }: Transform) {
    this.document = {
      ...this.document,
      ...([TransformType.Core, TransformType.Reference].includes(transformType)
        ? { coreMigrationVersion: maxVersion(this.document.coreMigrationVersion, version) }
        : { typeMigrationVersion: maxVersion(this.document.typeMigrationVersion, version) }),
    };
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

  run(): void {
    this.assertValidity();

    for (const transform of this.getPipeline()) {
      const { typeMigrationVersion: previousVersion } = this.document;
      const { additionalDocs, transformedDoc } = transform.transform(this.document);
      this.document = transformedDoc;
      this.additionalDocs.push(...additionalDocs.map((document) => this.ensureVersion(document)));

      this.assertUpgrade(transform, previousVersion);
      this.bumpVersion(transform);
    }

    this.assertCompatibility();

    this.document = this.ensureVersion(this.document);
  }
}
