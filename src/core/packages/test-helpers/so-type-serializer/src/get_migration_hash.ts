/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uniq } from 'lodash';
import { createHash } from 'crypto';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import {
  extractMigrationInfo,
  type SavedObjectTypeMigrationInfo,
  type ModelVersionSummary,
} from './extract_migration_info';

type SavedObjectTypeMigrationHash = string;
type SavedObjectTypeMigrationHashes = string[];

export const getTypeHashes = (soType: SavedObjectsType): SavedObjectTypeMigrationHashes => {
  const migrationInfo = extractMigrationInfo(soType);
  const migrationHashes = soType.migrations ? getMigrationsHashes(soType) : [];
  const modelVersionsHashes = soType.modelVersions ? getModelVersionsHashes(soType) : [];

  const warning = [];
  const hasMigrationsWrapper =
    uniq(migrationHashes.map((entry) => entry.split(': ').pop())).length < migrationHashes.length;
  const hasModelVersionsWrapper =
    uniq(modelVersionsHashes.map((entry) => entry.split(': ').pop())).length <
    modelVersionsHashes.length;

  if (hasMigrationsWrapper || hasModelVersionsWrapper) {
    warning.push(
      `${soType.name}|warning: The SO type owner should ensure these transform functions DO NOT mutate after they are defined.`
    );

    if (hasMigrationsWrapper) {
      warning.push(
        `${soType.name}|warning: This type uses 'migrations:' WRAPPER functions that prevent detecting changes in the implementation.`
      );
    }
    if (hasModelVersionsWrapper) {
      warning.push(
        `${soType.name}|warning: This type uses 'modelVersions:' WRAPPER functions that prevent detecting changes in the implementation.`
      );
    }
  }

  return [
    ...warning,
    ...migrationHashes,
    ...modelVersionsHashes,
    `${soType.name}|schemas: ${getTypeSchemasHash(migrationInfo)}`,
    `${soType.name}|mappings: ${getTypeMappingsHash(migrationInfo)}`,
    `${soType.name}|global: ${getTypeGlobalHash(migrationInfo)}`,
  ].reverse();
};

const getTypeGlobalHash = (migInfo: SavedObjectTypeMigrationInfo): string => {
  const hash = createHash('sha1'); // eslint-disable-line @kbn/eslint/no_unsafe_hash
  const globalData = [
    migInfo.name,
    migInfo.namespaceType,
    migInfo.convertToAliasScript,
    migInfo.hasExcludeOnUpgrade,
    migInfo.convertToMultiNamespaceTypeVersion,
    migInfo.schemaVersions,
  ].join('|');

  return hash.update(globalData).digest('hex');
};

const getTypeMappingsHash = (migInfo: SavedObjectTypeMigrationInfo): string => {
  const hash = createHash('sha1'); // eslint-disable-line @kbn/eslint/no_unsafe_hash
  const mappingData = JSON.stringify(migInfo.mappings, Object.keys(migInfo.mappings).sort());
  return hash.update(mappingData).digest('hex');
};

const getTypeSchemasHash = (migInfo: SavedObjectTypeMigrationInfo): string => {
  const hash = createHash('sha1'); // eslint-disable-line @kbn/eslint/no_unsafe_hash
  const schemaData = migInfo.schemaVersions.join('|');
  return hash.update(schemaData).digest('hex');
};

const getMigrationsHashes = (soType: SavedObjectsType): string[] => {
  const migrations =
    typeof soType.migrations === 'function' ? soType.migrations() : soType.migrations!;

  return Object.entries(migrations).map(([version, migration]) => {
    const hash = createHash('sha1'); // eslint-disable-line @kbn/eslint/no_unsafe_hash
    const migrationData =
      typeof migration === 'function'
        ? migration.toString()
        : [!!migration.deferred, migration.transform.toString()].join('|');
    return `${soType.name}|${version}: ${hash.update(migrationData).digest('hex')}`;
  });
};

const getModelVersionsHashes = (soType: SavedObjectsType): string[] => {
  const modelVersions =
    typeof soType.modelVersions === 'function' ? soType.modelVersions() : soType.modelVersions!;

  return Object.entries(modelVersions).map(([version, modelVersion], index) => {
    if (`${++index}` !== version) {
      throw new Error(
        `Missing model version '${index}' (10.${index}.0) for SO type ${soType.name}. Please define versions in order and without skipping any version numbers.`
      );
    }
    const hash = createHash('sha1'); // eslint-disable-line @kbn/eslint/no_unsafe_hash
    const modelVersionData = JSON.stringify(modelVersion);
    return `${soType.name}|10.${version}.0: ${hash.update(modelVersionData).digest('hex')}`;
  });
};

export const getMigrationHash = (soType: SavedObjectsType): SavedObjectTypeMigrationHash => {
  const migInfo = extractMigrationInfo(soType);

  const hash = createHash('sha1'); // eslint-disable-line @kbn/eslint/no_unsafe_hash

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
