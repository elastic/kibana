/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchCapabilities } from '@kbn/core-elasticsearch-server';
import type { MigrationAlgorithm } from './types';

// a Map, so that inherited object keys (e.g. `constructor`) aren't valid flag values
const ALGORITHM_GROUPS: ReadonlyMap<string, readonly MigrationAlgorithm[]> = new Map([
  ['v2', ['v2']],
  ['zdt', ['zdt']],
  ['v3', ['v3']],
  ['both', ['v2', 'zdt']],
  ['all', ['v2', 'zdt', 'v3']],
]);

export const ALGORITHM_FLAG_VALUES = [...ALGORITHM_GROUPS.keys()];

/** The migration algorithms to run the rollback tests with, for the given `--algorithm` flag. */
export const parseAlgorithmFlag = (flag: string): MigrationAlgorithm[] => {
  const algorithms = ALGORITHM_GROUPS.get(flag);
  if (!algorithms) {
    throw new Error(
      `Invalid --algorithm value '${flag}'. Must be one of: ${ALGORITHM_FLAG_VALUES.join(', ')}`
    );
  }
  return [...algorithms];
};

export interface MigratorOptions {
  settings: { migrations: { algorithm: MigrationAlgorithm } };
  esCapabilities?: Partial<ElasticsearchCapabilities>;
}

/** The steps of the rollback tests: the baseline, the upgrade (run twice) and the rollback. */
export type RollbackTestPhase = 'baseline' | 'upgrade' | 'rollback';

/**
 * The migrator test kit options for the given algorithm and phase.
 * Rollbacks of model versions are a Serverless concern: v3 rejects them on classic deployments,
 * so the v3 rollback runs with the Serverless behaviours. The other phases run with the classic ones.
 */
export const getMigratorOptions = (
  algorithm: MigrationAlgorithm,
  phase: RollbackTestPhase
): MigratorOptions => ({
  settings: { migrations: { algorithm } },
  ...(algorithm === 'v3' && phase === 'rollback' && { esCapabilities: { serverless: true } }),
});
