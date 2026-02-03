/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ModelVersionIdentifier, SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { MigrationInfoRecord } from '../types';

/**
 * Returns the list of versions defined for a given SO type; sorted from newest to oldest.
 * 0.0.0 is also included for convenience, as the "initial" version
 * @param typeSnapshot the snapshot from which versions are extracted
 * @returns list of versions
 */
export function getVersions(
  typeSnapshot: Pick<MigrationInfoRecord, 'migrationVersions' | 'modelVersions'>
): string[] {
  return [
    '0.0.0',
    ...typeSnapshot.migrationVersions,
    ...typeSnapshot.modelVersions.map(({ version }) => `10.${version}.0`),
  ].reverse() as string[];
}

export function latestVersionIdentifier(
  type: SavedObjectsType<any>
): ModelVersionIdentifier | undefined {
  const modelVersions =
    typeof type.modelVersions === 'function' ? type.modelVersions() : type.modelVersions;
  const ids = Object.keys(modelVersions ?? {});
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  const latest = ids.sort(collator.compare).pop() as ModelVersionIdentifier;
  return latest;
}
