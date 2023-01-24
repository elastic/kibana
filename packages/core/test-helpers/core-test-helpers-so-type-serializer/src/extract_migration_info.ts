/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { compare as semverCompare } from 'semver';
import { getFlattenedObject } from '@kbn/std';
import type { SavedObjectsNamespaceType } from '@kbn/core-saved-objects-common';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';

export interface SavedObjectTypeMigrationInfo {
  name: string;
  namespaceType: SavedObjectsNamespaceType;
  convertToAliasScript?: string;
  convertToMultiNamespaceTypeVersion?: string;
  migrationVersions: string[];
  schemaVersions: string[];
  mappings: Record<string, unknown>;
  hasExcludeOnUpgrade: boolean;
}

/**
 * Extract all migration-relevant informations bound to given type in a serializable format.
 *
 * @param soType
 */
export const extractMigrationInfo = (soType: SavedObjectsType): SavedObjectTypeMigrationInfo => {
  const migrationMap =
    typeof soType.migrations === 'function' ? soType.migrations() : soType.migrations;
  const migrationVersions = Object.keys(migrationMap ?? {});
  migrationVersions.sort(semverCompare);

  const schemaMap = typeof soType.schemas === 'function' ? soType.schemas() : soType.schemas;
  const schemaVersions = Object.keys(schemaMap ?? {});
  schemaVersions.sort(semverCompare);

  return {
    name: soType.name,
    namespaceType: soType.namespaceType,
    convertToAliasScript: soType.convertToAliasScript,
    convertToMultiNamespaceTypeVersion: soType.convertToMultiNamespaceTypeVersion,
    migrationVersions,
    schemaVersions,
    mappings: getFlattenedObject(soType.mappings ?? {}),
    hasExcludeOnUpgrade: !!soType.excludeOnUpgrade,
  };
};
