/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ListrTask } from 'listr2';
import { resolve } from 'path';
import { takeSnapshot } from '../../snapshots';
import type { Task, TaskContext } from '../types';
import { fileToJson } from '../../util';
import type { MigrationSnapshot } from '../../types';

const BASELINE_SNAPSHOT_PATH = resolve(__dirname, './baseline_snapshot.json');

export const getTestSnapshots: Task = async (ctx, task) => {
  const subtasks: ListrTask<TaskContext>[] = [
    {
      title: `Obtain snapshot for baseline (test mode)`,
      task: async () => {
        ctx.from = (await fileToJson(BASELINE_SNAPSHOT_PATH)) as MigrationSnapshot;
      },
      retry: {
        delay: 2000,
        tries: 5,
      },
    },
    {
      title: `Take snapshot of current SO type definitions`,
      task: async () => {
        ctx.to = await takeSnapshot(ctx.registeredTypes!);
      },
    },
  ];

  return task.newListr<TaskContext>(subtasks, { concurrent: true });
};
