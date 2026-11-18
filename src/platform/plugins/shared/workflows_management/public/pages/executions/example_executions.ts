/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus, type WorkflowExecutionListItemDto } from '@kbn/workflows';

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

/** Shown only when the read-only prototype is on and the cluster has no executions. */
export const EXAMPLE_EXECUTIONS: WorkflowExecutionListItemDto[] = [
  {
    spaceId: 'default',
    id: 'example-exec-suspicious-login',
    workflowId: 'example-suspicious-login',
    workflowName: 'Detect suspicious login',
    status: ExecutionStatus.COMPLETED,
    isTestRun: false,
    startedAt: minutesAgo(42),
    finishedAt: minutesAgo(41),
    duration: 18_000,
    error: null,
    triggeredBy: 'alert',
    tags: ['security'],
  },
  {
    spaceId: 'default',
    id: 'example-exec-high-severity',
    workflowId: 'example-high-severity',
    workflowName: 'Notify on high severity alert',
    status: ExecutionStatus.FAILED,
    isTestRun: false,
    startedAt: minutesAgo(95),
    finishedAt: minutesAgo(94),
    duration: 6_000,
    error: null,
    triggeredBy: 'alert',
    tags: ['detection'],
  },
  {
    spaceId: 'default',
    id: 'example-exec-enrich-incident',
    workflowId: 'example-enrich-incident',
    workflowName: 'Enrich incident context',
    status: ExecutionStatus.COMPLETED,
    isTestRun: false,
    startedAt: minutesAgo(180),
    finishedAt: minutesAgo(178),
    duration: 42_000,
    error: null,
    triggeredBy: 'manual',
    tags: ['incident'],
  },
  {
    spaceId: 'default',
    id: 'example-exec-daily-coverage',
    workflowId: 'example-daily-coverage',
    workflowName: 'Daily detection coverage check',
    status: ExecutionStatus.COMPLETED,
    isTestRun: false,
    startedAt: minutesAgo(360),
    finishedAt: minutesAgo(358),
    duration: 90_000,
    error: null,
    triggeredBy: 'scheduled',
  },
];
