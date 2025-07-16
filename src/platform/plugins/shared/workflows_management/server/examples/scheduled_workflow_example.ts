/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CreateWorkflowCommand, WorkflowStatus } from '@kbn/workflows';

/**
 * Example of creating a workflow with scheduled triggers
 * This demonstrates how to create interval-based workflows
 */
export const createScheduledWorkflowExample = (): CreateWorkflowCommand => {
  return {
    name: 'Scheduled Data Processing Workflow',
    description: 'A workflow that processes data every 5 minutes',
    status: WorkflowStatus.ACTIVE,
    triggers: [
      {
        id: 'scheduled-trigger',
        type: 'schedule',
        enabled: true,
        config: {
          every: '5',
          unit: 'minute',
        },
      },
    ],
    steps: [
      {
        id: 'step-1',
        connectorType: 'console',
        connectorName: 'console',
        inputs: {
          message: 'Scheduled workflow executed at {{now}}',
        },
      },
      {
        id: 'step-2',
        connectorType: 'http.request',
        connectorName: 'http.request',
        inputs: {
          url: 'https://api.example.com/process-data',
          method: 'POST',
          body: {
            timestamp: '{{now}}',
            workflowId: '{{workflow.id}}',
          },
        },
      },
    ],
    tags: ['scheduled', 'data-processing'],
    yaml: `
version: '1'
workflow:
  name: 'Scheduled Data Processing Workflow'
  description: 'A workflow that processes data every 5 minutes'
  enabled: true
  triggers:
    - type: 'triggers.elastic.scheduled'
      with:
        every: '5'
        unit: 'minute'
  steps:
    - name: 'Log execution'
      type: 'console'
      with:
        message: 'Scheduled workflow executed at {{now}}'
    - name: 'Process data'
      type: 'http.request'
      with:
        url: 'https://api.example.com/process-data'
        method: 'POST'
        body:
          timestamp: '{{now}}'
          workflowId: '{{workflow.id}}'
`,
  };
};

/**
 * Example of creating a workflow with cron-based scheduling
 */
export const createCronWorkflowExample = (): CreateWorkflowCommand => {
  return {
    name: 'Daily Report Workflow',
    description: 'A workflow that generates daily reports at 9 AM',
    status: WorkflowStatus.ACTIVE,
    triggers: [
      {
        id: 'daily-trigger',
        type: 'schedule',
        enabled: true,
        config: {
          cron: '0 9 * * *', // Every day at 9 AM
        },
      },
    ],
    steps: [
      {
        id: 'generate-report',
        connectorType: 'console',
        connectorName: 'console',
        inputs: {
          message: 'Generating daily report for {{now}}',
        },
      },
    ],
    tags: ['daily', 'report'],
    yaml: `
version: '1'
workflow:
  name: 'Daily Report Workflow'
  description: 'A workflow that generates daily reports at 9 AM'
  enabled: true
  triggers:
    - type: 'triggers.elastic.scheduled'
      with:
        cron: '0 9 * * *'
  steps:
    - name: 'Generate report'
      type: 'console'
      with:
        message: 'Generating daily report for {{now}}'
`,
  };
}; 