/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * This file contains logic for transforming / migrating a saved object document.
 *
 * At first, it may seem as if this could be a simple filter + reduce operation,
 * running the document through a linear set of transform functions until it is
 * up to date, but there are some edge cases that make it more complicated.
 *
 * A transform can add a new property, rename an existing property, remove a property, etc.
 * This means that we aren't able to do a reduce over a fixed list of properties, as
 * each transform operation could essentially change what transforms should be applied
 * next.
 *
 * The basic algorithm, then, is this:
 *
 * While there are any unmigrated properties in the doc, find the next unmigrated property,
 * and run the doc through the transforms that target that property.
 *
 * This way, we keep looping until there are no transforms left to apply, and we properly
 * handle property addition / deletion / renaming.
 *
 * A caveat is that this means we must restrict what a migration can do to the doc's
 * migrationVersion itself. Migrations should *not* make any changes to the migrationVersion property.
 *
 * One last gotcha is that any docs which have no migrationVersion are assumed to be up-to-date.
 * This is because Kibana UI and other clients really can't be expected build the migrationVersion
 * in a reliable way. Instead, callers of our APIs are expected to send us up-to-date documents,
 * and those documents are simply given a stamp of approval by this transformer. This is why it is
 * important for migration authors to *also* write a saved object validation that will prevent this
 * assumption from inserting out-of-date documents into the index.
 *
 * If the client(s) send us documents with migrationVersion specified, we will migrate them as
 * appropriate. This means for data import scenarios, any documetns being imported should be explicitly
 * given an empty migrationVersion property {} if no such property exists.
 */

import Boom from '@hapi/boom';
import Semver from 'semver';
import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { ActiveMigrations, Transform, TransformType } from './types';
import { maxVersion } from './utils';

function isGreater(a?: string, b?: string) {
  return !!a && Semver.valid(a) && (!b || (Semver.valid(b) && Semver.gt(a, b)));
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
          // And at the same time, documents with `undefined` in `migrationVersion` are treated as the most recent ones.
          // This is a workaround to get into the loop again and apply all the migrations for the new type.
          this.document.migrationVersion = '';
          break;
        }
      }
    }
  }

  private hasPendingTransforms() {
    const { coreMigrationVersion, migrationVersion, type } = this.document;
    const latestVersion = this.migrations[type]?.latestVersion;

    if (isGreater(latestVersion?.core, coreMigrationVersion)) {
      return true;
    }

    if (migrationVersion == null) {
      return false;
    }

    return (
      isGreater(latestVersion?.migrate, migrationVersion) ||
      (this.convertNamespaceTypes && isGreater(latestVersion?.convert, migrationVersion)) ||
      (this.convertNamespaceTypes && isGreater(latestVersion?.reference, coreMigrationVersion))
    );
  }

  private getPendingTransforms() {
    const { transforms } = this.migrations[this.document.type];

    return transforms.filter((transform) => this.isPendingTransform(transform));
  }

  private isPendingTransform({ transformType, version }: Transform) {
    const { coreMigrationVersion, migrationVersion, type } = this.document;
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
          migrationVersion != null &&
          this.convertNamespaceTypes &&
          isGreater(version, migrationVersion)
        );
      case TransformType.Migrate:
        return migrationVersion != null && isGreater(version, migrationVersion);
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
    const { id, type, migrationVersion: currentVersion } = this.document;
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
   * Transforms that remove or downgrade migrationVersion properties are not allowed,
   * as this could get us into an infinite loop. So, we explicitly check for that here.
   */
  private assertUpgrade({ transformType, version }: Transform, previousVersion?: string) {
    if ([TransformType.Core, TransformType.Reference].includes(transformType)) {
      return;
    }

    const { migrationVersion: currentVersion, type } = this.document;

    if (isGreater(previousVersion, currentVersion)) {
      throw new Error(
        `Migration "${type} v${version}" attempted to downgrade "migrationVersion" from ${previousVersion} to ${currentVersion}.`
      );
    }
  }

  private bumpVersion({ transformType, version }: Transform) {
    if ([TransformType.Core, TransformType.Reference].includes(transformType)) {
      this.document.coreMigrationVersion = maxVersion(this.document.coreMigrationVersion, version);

      return;
    }

    this.document.migrationVersion = maxVersion(this.document.migrationVersion, version);
  }

  private ensureVersion({
    coreMigrationVersion: currentCoreMigrationVersion,
    migrationVersion: currentMigrationVersion,
    ...document
  }: SavedObjectUnsanitizedDoc) {
    const { type } = document;
    const latestVersion = this.migrations[type]?.latestVersion;
    const coreMigrationVersion =
      currentCoreMigrationVersion || maxVersion(latestVersion?.core, latestVersion?.reference);
    const migrationVersion =
      currentMigrationVersion || maxVersion(latestVersion?.migrate, latestVersion?.convert);

    return {
      ...document,
      ...(migrationVersion ? { migrationVersion } : {}),
      ...(coreMigrationVersion ? { coreMigrationVersion } : {}),
    };
  }

  run(): void {
    this.assertValidity();

    for (const transform of this.getPipeline()) {
      const { migrationVersion: previousVersion } = this.document;
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
