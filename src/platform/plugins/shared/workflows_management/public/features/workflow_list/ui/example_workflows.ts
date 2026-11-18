/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus, type WorkflowListItemDto, type WorkflowYaml } from '@kbn/workflows';

const exampleDefinition = (name: string, tags: string[], triggerType: string): WorkflowYaml =>
  ({
    version: '1',
    name,
    enabled: true,
    tags,
    triggers: [{ type: triggerType }],
    steps: [{ name: 'notify', type: 'slack' }],
  } as WorkflowYaml);

const exampleWorkflow = (
  id: string,
  name: string,
  description: string,
  tags: string[],
  triggerType: string,
  enabled: boolean
): WorkflowListItemDto => ({
  id,
  name,
  description,
  enabled,
  valid: true,
  createdAt: '2026-10-20T14:00:00.000Z',
  definition: exampleDefinition(name, tags, triggerType),
  history: [
    {
      id: `${id}-run`,
      workflowId: id,
      workflowName: name,
      status: enabled ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED,
      startedAt: '2026-10-29T11:00:00.000Z',
      finishedAt: '2026-10-29T11:00:08.000Z',
      duration: 8000,
    },
  ],
});

/** Shown after Clear all when the cluster has no workflows yet. */
export const EXAMPLE_WORKFLOWS: WorkflowListItemDto[] = [
  exampleWorkflow(
    'example-suspicious-login',
    'Detect suspicious login',
    'Alerts when a user signs in from a new location.',
    ['security', 'identity'],
    'alert',
    true
  ),
  exampleWorkflow(
    'example-high-severity',
    'Notify on high severity alert',
    'Sends a Slack message for high severity alerts.',
    ['security', 'notification'],
    'alert',
    true
  ),
  exampleWorkflow(
    'example-enrich-incident',
    'Enrich incident context',
    'Adds host and user context to a new incident.',
    ['cases'],
    'manual',
    true
  ),
  exampleWorkflow(
    'example-daily-coverage',
    'Daily detection coverage check',
    'Reviews detection coverage every morning.',
    ['detection'],
    'scheduled',
    false
  ),
];
