/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { extractMigrationInfo } from './extract_migration_info';

type SavedObjectTypeMigrationHash = string;

export const getMigrationHash = (soType: SavedObjectsType): SavedObjectTypeMigrationHash => {
  const migInfo = extractMigrationInfo(soType);

  const hash = createHash('sha1');

  const hashParts = [
    migInfo.name,
    migInfo.namespaceType,
    migInfo.convertToMultiNamespaceTypeVersion ?? 'none',
    migInfo.migrationVersions.join(','),
    migInfo.schemaVersions.join(','),
    JSON.stringify(migInfo.mappings, Object.keys(migInfo.mappings).sort()),
  ];
  const hashFeed = hashParts.join('-');

  return hash.update(hashFeed).digest('hex');
};
