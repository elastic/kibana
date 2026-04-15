/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getVersions } from './versions';
import type { MigrationInfoRecord } from '../types';

function makeTypeSnapshot(
  migrationVersions: string[],
  modelCount: number
): Pick<MigrationInfoRecord, 'migrationVersions' | 'modelVersions'> {
  // Construct minimal model version entries that conform to the expected shape.
  const modelVersions = Array.from({ length: modelCount }, (_, i) => ({
    version: `${i + 1}`,
    changeTypes: [] as string[],
    hasTransformation: false,
    newMappings: [] as string[],
    schemas: { create: false, forwardCompatibility: false },
  }));
  return { migrationVersions, modelVersions } as Pick<
    MigrationInfoRecord,
    'migrationVersions' | 'modelVersions'
  >;
}

describe('getVersions', () => {
  it('returns ["0.0.0"] when there are no migrations or model versions', () => {
    const typeSnapshot = makeTypeSnapshot([], 0);
    expect(getVersions(typeSnapshot)).toEqual(['0.0.0']);
  });

  it('includes migrationVersions and generated model versions and reverses newest-to-oldest', () => {
    const typeSnapshot = makeTypeSnapshot(['7.10.0', '8.0.0'], 2); // modelVersions -> 10.1.0, 10.2.0

    expect(getVersions(typeSnapshot)).toEqual(['10.2.0', '10.1.0', '8.0.0', '7.10.0', '0.0.0']);
  });

  it('handles single migrationVersion and single modelVersion', () => {
    const typeSnapshot = makeTypeSnapshot(['1.0.0'], 1); // -> 10.1.0

    expect(getVersions(typeSnapshot)).toEqual(['10.1.0', '1.0.0', '0.0.0']);
  });

  it('preserves duplicates from migrationVersions and includes model versions accordingly', () => {
    const typeSnapshot = makeTypeSnapshot(['2.0.0', '2.0.0'], 3); // -> 10.1.0,10.2.0,10.3.0

    expect(getVersions(typeSnapshot)).toEqual([
      '10.3.0',
      '10.2.0',
      '10.1.0',
      '2.0.0',
      '2.0.0',
      '0.0.0',
    ]);
  });
});
