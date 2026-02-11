/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AlertHit } from '@kbn/alerting-plugin/server/types';
import type { Logger } from '@kbn/core/server';
import type { TriggerType } from '@kbn/workflows/spec/schema/triggers/trigger_schema';
import type { z } from '@kbn/zod';
import type { ExecutorParamsSchema } from './schema';

export type ExecutorParams = z.infer<typeof ExecutorParamsSchema>;
export type WorkflowsActionParamsType = ExecutorParams;

export interface RunWorkflowParams {
  workflowId: string;
  spaceId: string;
  summaryMode?: boolean;
  inputs: {
    event: {
      alerts: AlertHit[];
      rule: {
        id: string;
        name: string;
        tags: string[];
        consumer: string;
        producer: string;
        ruleTypeId: string;
      };
      ruleUrl?: string;
      spaceId: string;
    };
  };
  [key: string]: unknown;
}

export type ExecutorSubActionRunParams = RunWorkflowParams;

export interface WorkflowsExecutorResultData {
  workflowRunId: string;
  status: string;
}

export interface WorkflowExecutionResponse {
  workflowRunId: string;
  status: string;
}

export interface ScheduleWorkflowParams {
  workflowId: string;
  spaceId: string;
  inputs: {
    event: {
      alerts: AlertHit[];
      rule: {
        id: string;
        name: string;
        tags: string[];
        consumer: string;
        producer: string;
        ruleTypeId: string;
      };
      ruleUrl?: string;
      spaceId: string;
    };
  };
  triggeredBy?: TriggerType | undefined;
}

export interface ExternalService {
  runWorkflow: (params: RunWorkflowParams) => Promise<WorkflowExecutionResponse>;
  scheduleWorkflow: (params: ScheduleWorkflowParams) => Promise<string>;
}

export interface ExternalServiceApiHandlerArgs {
  externalService: ExternalService;
  params: ExecutorSubActionRunParams;
  logger: Logger;
}
