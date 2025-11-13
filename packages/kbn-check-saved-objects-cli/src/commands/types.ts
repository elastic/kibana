/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ListrTask } from 'listr2';
import type { FixtureTemplate } from '../migrations/fixtures';
import type { MigrationSnapshot, ServerHandles } from '../types';

export type Task = ListrTask<TaskContext>['task'];

export interface TaskContext {
  gitRev: string;
  serverHandles?: ServerHandles;
  from?: MigrationSnapshot;
  to?: MigrationSnapshot;
  newTypes: string[];
  updatedTypes: string[];
  fixtures: Record<
    string,
    {
      previous: FixtureTemplate[];
      current: FixtureTemplate[];
    }
  >;
  fix: boolean;
}
