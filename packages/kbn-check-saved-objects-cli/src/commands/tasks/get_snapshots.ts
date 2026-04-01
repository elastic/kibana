/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ListrTask } from 'listr2';
import { fetchSnapshot, takeSnapshot } from '../../snapshots';
import type { Task, TaskContext } from '../types';

export const getSnapshots: Task = async (ctx, task) => {
  const subtasks: ListrTask<TaskContext>[] = [
    {
      title: `Obtain snapshot for baseline '${ctx.gitRev}'`,
      task: async () => {
        ctx.from = await fetchSnapshot(ctx.gitRev);
      },
      retry: {
        delay: 2000,
        tries: 5,
      },
    },
    {
      title: `Obtain snapshot for current serverless baseline '${ctx.serverlessGitRev}'`,
      task: async () => {
        ctx.serverlessFrom = await fetchSnapshot(ctx.serverlessGitRev!);
      },
      enabled: () => Boolean(ctx.serverlessGitRev) && ctx.serverlessGitRev !== ctx.gitRev,
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
