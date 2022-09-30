/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compare as semverCompare } from 'semver';
import { getFlattenedObject } from '@kbn/std';
import type { SavedObjectsNamespaceType } from '@kbn/core-saved-objects-common';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';

export interface SavedObjectTypeMigrationInfo {
  name: string;
  namespaceType: SavedObjectsNamespaceType;
  convertToMultiNamespaceTypeVersion?: string;
  migrationVersions: string[];
  schemaVersions: string[];
  mappings: Record<string, unknown>;
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
    convertToMultiNamespaceTypeVersion: soType.convertToMultiNamespaceTypeVersion,
    migrationVersions,
    schemaVersions,
    mappings: getFlattenedObject(soType.mappings ?? {}),
  };
};
