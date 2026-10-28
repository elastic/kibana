/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RemoteModule } from '@kbn/core-remote-common';
import { WorkflowExecutorToken, WorkflowLogToken, WorkflowStorageToken } from './tokens';

export { WorkflowExecutorToken, WorkflowLogToken, WorkflowStorageToken } from './tokens';
export type { WorkflowExecutorApi, WorkflowLogApi, WorkflowStorageApi } from './tokens';

export const remoteModule: RemoteModule = {
  providers: [
    {
      token: WorkflowExecutorToken,
      placement: 'executor',
      role: 'root',
      modulePath: require.resolve('./workflow_executor'),
      exportName: 'WorkflowExecutor',
    },
    {
      token: WorkflowStorageToken,
      placement: 'coordinator',
      modulePath: require.resolve('./workflow_storage'),
      exportName: 'WorkflowStorage',
    },
    {
      token: WorkflowLogToken,
      placement: 'coordinator',
      modulePath: require.resolve('./workflow_log'),
      exportName: 'WorkflowLog',
    },
  ],
};
