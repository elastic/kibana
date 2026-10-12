/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { ChildWorkflowExecutionItem } from '@kbn/workflows';
import type {
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '@kbn/workflows-execution-engine/server';
import { getChildExecutions } from '@kbn/workflows-execution-engine/server';

const silentLogger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
  trace() {},
  fatal() {},
  log() {},
  get() {
    return silentLogger;
  },
} as unknown as Logger;

interface GetChildWorkflowExecutionsParams {
  workflowExecutionsDataClient: WorkflowExecutionsDataClient;
  stepExecutionsDataClient: StepExecutionsDataClient;
  parentExecutionId: string;
  spaceId: string;
}

export const getChildWorkflowExecutions = async ({
  workflowExecutionsDataClient,
  stepExecutionsDataClient,
  parentExecutionId,
  spaceId,
}: GetChildWorkflowExecutionsParams): Promise<ChildWorkflowExecutionItem[]> =>
  getChildExecutions(
    {
      logger: silentLogger,
      workflowExecutionsDataClient,
      stepExecutionsDataClient,
    },
    { parentExecutionId, spaceId }
  );
