/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defaultKibanaIndex } from '@kbn/migrator-test-kit';
import type { Task } from '../types';
import { TEST_TYPES } from '../test';
import { takeSnapshot } from '../../snapshots';
import { getLatestTypeFixtures } from '../../migrations/fixtures';
import { getVersions } from '../../migrations/versions';

/**
 * Fallback to test mode when no real SO types have been updated.
 *
 * This provides a smoke test for the migration logic on every PR,
 * ensuring no regressions in the migration code even when no SO
 * type definitions have changed.
 */
export const fallbackToTestMode: Task = async (ctx, task) => {
  ctx.updatedTypes = TEST_TYPES.map((type) => ({
    ...type,
    indexPattern: defaultKibanaIndex,
  }));
  ctx.fallbackToTestMode = true;
  ctx.to = await takeSnapshot(ctx.updatedTypes);

  // Load fixtures for each test type
  for (const type of ctx.updatedTypes) {
    const { name } = type;
    const typeSnapshot = ctx.to.typeDefinitions[name];
    const [current, previous] = getVersions(typeSnapshot);

    const typeFixtures = await getLatestTypeFixtures({
      type,
      current,
      previous,
      fix: ctx.fix,
    });

    ctx.fixtures.previous[name] = typeFixtures.previous;
    ctx.fixtures.current[name] = typeFixtures.current;
  }

  task.title = `Fallback to test mode: using ${ctx.updatedTypes.length} test types for rollback tests`;
};
