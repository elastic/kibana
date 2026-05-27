/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import equal from 'fast-deep-equal';
import type { MigrationSnapshot } from '../types';

export interface ClassifiedUpdatedTypes {
  /** All types whose snapshot entry changed between the two snapshots. */
  updatedTypes: string[];
  /**
   * Subset of `updatedTypes` where the model version count increased.
   * Types with only schema-only mutations in existing model versions are excluded:
   * they don't require fixture verification or rollback tests.
   */
  typesWithNewModelVersions: string[];
}

/**
 * Classifies updated SO types in a single pass over the snapshot diff.
 * This guarantees that `typesWithNewModelVersions` is always a strict subset
 * of `updatedTypes` without iterating the snapshot twice.
 */
export function classifyUpdatedTypes({
  from,
  to,
}: {
  from: MigrationSnapshot;
  to: MigrationSnapshot;
}): ClassifiedUpdatedTypes {
  const updatedTypes: string[] = [];
  const typesWithNewModelVersions: string[] = [];

  for (const type of Object.keys(to.typeDefinitions)) {
    const infoBefore = from.typeDefinitions[type];
    const infoAfter = to.typeDefinitions[type]!;
    if (!infoBefore || equal(infoBefore, infoAfter)) continue;

    updatedTypes.push(type);
    if (infoAfter.modelVersions.length > infoBefore.modelVersions.length) {
      typesWithNewModelVersions.push(type);
    }
  }

  return { updatedTypes, typesWithNewModelVersions };
}
