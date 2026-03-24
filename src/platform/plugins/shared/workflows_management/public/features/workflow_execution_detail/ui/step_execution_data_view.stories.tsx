/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import type { ExecutionStatus } from '@kbn/workflows';
import { StepExecutionDataView } from './step_execution_data_view';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';

// Decorator to ensure full height container
const heightDecorator = (Story: React.ComponentType) => (
  <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
    <Story />
  </div>
);

const meta: Meta = {
  title: 'Workflows Management/Step Execution Data View',
  component: StepExecutionDataView,
  decorators: [kibanaReactDecorator, heightDecorator],
};

export default meta;

type Story = StoryObj<typeof StepExecutionDataView>;

const stepExecution = {
  id: 'step-exec-1',
  stepId: 'step-1',
  status: 'completed' as ExecutionStatus,
  startedAt: '2023-10-01T12:00:00Z',
  executionTimeMs: 300000,
  scopeStack: [],
  workflowRunId: 'run-123',
  workflowId: 'id-123',
  topologicalIndex: 0,
  globalExecutionIndex: 0,
  stepExecutionIndex: 0,
};

const alertsMockData = {
  alerts: {
    new: {
      count: 1,
      data: [
        {
          _id: '2edb68f4-4f17-476a-87aa-0a58653de26f',
          _index: '.internal.alerts-stack.alerts-default-000001',
          kibana: {
            alert: {
              url: '/elw/app/r?l=DISCOVER_APP_LOCATOR&v=9.2.0&lz=N4IgJghgLhBqCWBTA7gZQA6IMYgFynjDxEQGcB9ARwFdEAnAT3LuoBtFyIwALAey3KQY5AG5JkIADQgo8KO2IBbBgFp4AOzCIAHlJnxFiAGJJWYAHIRDxWYdIxF6EAF9pAM3iso9UngDaoIrQWNycrKx4wK4ghjCRIBpaurgkFDT0TCzsnDz8gtAQouJ6UAyYxFjU9ryKemDwpBAARuxEuG4QrKSI0uqIAObQiHgdXT0gnfAQvikASmyIAATpjIsAIqgAMi7SACT2Q%2FHVdMMpEOjoqDDeLs4AutK2iLMQ6v2noG50NcQATAAMvwArCp%2FgAOFS%2FABsABUAIz%2FXBA364X4AZgAdFCob8AFolXh%2FQEg8GQ2EIpEooGY7F4nYJUgAQXYdCgszIbCgMygLEQziAA%3D',
              reason:
                'Document count is 1 in the last 30s in my-index index. Alert when greater than 0.',
              title: "rule 'Elasticsearch query rule' matched query",
              evaluation: {
                conditions: 'Number of matching documents is greater than 0',
                value: '1',
                threshold: 0,
              },
              rule: {
                category: 'Elasticsearch query',
                consumer: 'stackAlerts',
                execution: {
                  uuid: '63aa2ced-e781-4228-bdfc-07acf797f716',
                  timestamp: '2025-08-26T10:52:53.635Z',
                },
                name: 'Elasticsearch query rule',
                parameters: {
                  timeField: 'timestamp',
                  index: ['my-index'],
                  esQuery: '{\n "query":{\n "match_all" : {}\n }\n }',
                  size: 100,
                  thresholdComparator: '>',
                  timeWindowSize: 30,
                  timeWindowUnit: 's',
                  threshold: [0],
                  aggType: 'count',
                  groupBy: 'all',
                  termSize: 5,
                  searchType: 'esQuery',
                  excludeHitsFromPreviousRun: false,
                  sourceFields: [],
                },
                producer: 'stackAlerts',
                revision: 0,
                rule_type_id: '.es-query',
                tags: [],
                uuid: '4be7dd58-3ea3-49f8-b457-6d64b6249115',
              },
              action_group: 'query matched',
              flapping: false,
              flapping_history: [
                true,
                true,
                false,
                false,
                true,
                false,
                true,
                false,
                false,
                false,
                false,
                false,
                false,
                true,
              ],
              instance: { id: 'query matched' },
              maintenance_window_ids: [],
              consecutive_matches: 1,
              pending_recovered_count: 0,
              status: 'active',
              uuid: '2edb68f4-4f17-476a-87aa-0a58653de26f',
              severity_improving: false,
              workflow_status: 'open',
              duration: { us: 0 },
              start: '2025-08-26T10:52:53.635Z',
              time_range: { gte: '2025-08-26T10:52:53.635Z' },
            },
            space_ids: ['default'],
            version: '9.2.0',
          },
          '@timestamp': '2025-08-26T10:52:53.635Z',
          event: { action: 'open', kind: 'signal' },
          tags: [],
        },
      ],
    },
  },
  rule: {
    id: '4be7dd58-3ea3-49f8-b457-6d64b6249115',
    name: 'Elasticsearch query rule',
    tags: [],
    consumer: 'stackAlerts',
    producer: 'stackAlerts',
    ruleTypeId: '.es-query',
  },
  spaceId: 'default',
};

export const Default: Story = {
  args: {
    mode: 'input',
    stepExecution: {
      ...stepExecution,
      input: alertsMockData.alerts,
    },
  },
};

export const ArrayData: Story = {
  args: {
    mode: 'input',
    stepExecution: {
      ...stepExecution,
      input: {
        alerts: [
          {
            name: 'Alert 1',
            description: 'Alert 1 description',
            severity: 'high',
          },
          {
            name: 'Alert 2',
            description: 'Alert 2 description',
            severity: 'medium',
          },
          {
            name: 'Alert 3',
            description: 'Alert 3 description',
            severity: 'low',
          },
        ],
      },
    },
  },
};

export const Empty: Story = {
  args: {
    mode: 'input',
    stepExecution: {
      ...stepExecution,
      input: {},
    },
  },
};
