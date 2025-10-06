/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CreateWorkflowCommand } from '@kbn/workflows';

/**
 * Example of creating a workflow with scheduled triggers
 * This demonstrates how to create interval-based workflows
 */
export const createScheduledWorkflowExample = (): CreateWorkflowCommand => {
  return {
    yaml: `version: '1'
name: 'Scheduled Data Processing Workflow'
description: 'A workflow that processes data every 5 minutes'
enabled: true
triggers:
  - type: 'scheduled'
    with:
      every: '5m'
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
 * Example of a workflow using RRule for daily scheduling
 * Runs every day at 9:00 AM UTC
 */
export const createDailyRRuleWorkflowExample = (): CreateWorkflowCommand => {
  return {
    yaml: `version: '1'
name: 'Daily RRule Workflow'
description: 'A workflow that runs daily at 9:00 AM UTC using RRule'
enabled: true
triggers:
  - type: 'scheduled'
    with:
      rrule:
        freq: 'DAILY'
        interval: 1
        tzid: 'UTC'
        byhour: [9]
        byminute: [0]
steps:
  - name: 'Log execution'
    type: 'console'
    with:
      message: 'Daily RRule workflow executed at {{now}}'
  - name: 'Process data'
    type: 'console'
    with:
      message: 'Processing daily data batch...'
`,
  };
};

/**
 * Example of a workflow using RRule for weekly scheduling
 * Runs every Monday and Friday at 2:00 PM EST
 */
export const createWeeklyRRuleWorkflowExample = (): CreateWorkflowCommand => {
  return {
    yaml: `version: '1'
name: 'Weekly RRule Workflow'
description: 'A workflow that runs on Monday and Friday at 2:00 PM EST using RRule'
enabled: true
triggers:
  - type: 'scheduled'
    with:
      rrule:
        freq: 'WEEKLY'
        interval: 1
        tzid: 'America/New_York'
        byweekday: ['MO', 'FR']
        byhour: [14]
        byminute: [0]
steps:
  - name: 'Log execution'
    type: 'console'
    with:
      message: 'Weekly RRule workflow executed at {{now}}'
  - name: 'Process data'
    type: 'console'
    with:
      message: 'Processing weekly data batch...'
`,
  };
};

/**
 * Example of creating a workflow with cron-based scheduling
 */
export const createCronWorkflowExample = (): CreateWorkflowCommand => {
  return {
    // name: 'Daily Report Workflow',
    // description: 'A workflow that generates daily reports at 9 AM',
    // status: WorkflowStatus.ACTIVE,
    // triggers: [
    //   {
    //     id: 'daily-trigger',
    //     type: 'schedule',
    //     enabled: true,
    //     config: {
    //       cron: '0 9 * * *', // Every day at 9 AM
    //     },
    //   },
    // ],
    // steps: [
    //   {
    //     id: 'generate-report',
    //     connectorType: 'console',
    //     connectorName: 'console',
    //     inputs: {
    //       message: 'Generating daily report for {{now}}',
    //     },
    //   },
    // ],
    // tags: ['daily', 'report'],
    yaml: `
version: '1'
workflow:
  name: 'Daily Report Workflow'
  description: 'A workflow that generates daily reports at 9 AM'
  enabled: true
  triggers:
    - type: 'scheduled'
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
