/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import type { ActiveMigrations, Transform } from '../types';
import type { MigrationPipeline, MigrationPipelineResult } from './types';
export declare class DocumentUpgradePipeline implements MigrationPipeline {
  private additionalDocs;
  private document;
  private originalDoc;
  private migrations;
  private kibanaVersion;
  private convertNamespaceTypes;
  private targetTypeVersion;
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
  });
  protected getPipeline(): Generator<Transform>;
  private hasPendingTransforms;
  private getPendingTransforms;
  private isPendingTransform;
  /**
   * Verifies that the document version is not greater than the version supported by Kibana.
   * If we have a document with some version and no migrations available for this type,
   * the document belongs to a future version.
   */
  private assertCompatibility;
  /**
   * Transforms that remove or downgrade `typeMigrationVersion` properties are not allowed,
   * as this could get us into an infinite loop. So, we explicitly check for that here.
   */
  private assertUpgrade;
  private ensureVersion;
  run(): MigrationPipelineResult;
}
