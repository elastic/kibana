/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'crypto';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { extractMigrationInfo, ModelVersionSummary } from './extract_migration_info';

type SavedObjectTypeMigrationHash = string;

export const getMigrationHash = (soType: SavedObjectsType): SavedObjectTypeMigrationHash => {
  const migInfo = extractMigrationInfo(soType);

  const hash = createHash('sha1');

  const hashParts = [
    migInfo.name,
    migInfo.namespaceType,
    migInfo.convertToAliasScript ?? 'none',
    migInfo.hasExcludeOnUpgrade,
    migInfo.convertToMultiNamespaceTypeVersion ?? 'none',
    migInfo.migrationVersions.join(','),
    migInfo.schemaVersions.join(','),
    JSON.stringify(migInfo.mappings, Object.keys(migInfo.mappings).sort()),
    migInfo.switchToModelVersionAt ?? 'none',
    migInfo.modelVersions.map(serializeModelVersion).join(','),
  ];
  const hashFeed = hashParts.join('-');

  return hash.update(hashFeed).digest('hex');
};

const serializeModelVersion = (modelVersion: ModelVersionSummary): string => {
  const schemas = [modelVersion.schemas.forwardCompatibility];
  return [
    modelVersion.version,
    modelVersion.changeTypes.join(','),
    modelVersion.hasTransformation,
    schemas.join(','),
    ...modelVersion.newMappings,
  ].join('|');
};
