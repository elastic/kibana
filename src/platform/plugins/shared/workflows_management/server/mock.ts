/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowExecutionEngineModel, Provider, WorkflowStatus } from '@kbn/workflows';

export const providers: Record<string, Provider> = {
  console: {
    type: 'console',
    action: async (stepInputs?: Record<string, any>) => {
      // eslint-disable-next-line no-console
      console.log(stepInputs?.message);
    },
    inputsDefinition: {
      message: {
        type: 'string',
        required: true,
        defaultValue: 'Default message from console provider',
      },
    },
  },
  'slow-console': {
    type: 'slow-console',
    action: async (stepInputs?: Record<string, any>) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      // eslint-disable-next-line no-console
      console.log(stepInputs?.message);
    },
    inputsDefinition: {
      message: {
        type: 'string',
        required: true,
        defaultValue: 'Default message from console provider',
      },
    },
  },
  // Add more providers as needed
};

const workflows: WorkflowExecutionEngineModel[] = [
  {
    id: 'example-workflow-1',
    name: 'Example Workflow 1',
    status: WorkflowStatus.ACTIVE,
    triggers: [
      {
        id: 'detection-rule',
        type: 'detection-rule',
        enabled: true,
        config: {},
      },
    ],
    steps: [
      {
        id: 'step1',
        connectorType: 'console',
        connectorName: 'console',
        inputs: {
          message: 'Step 1 executed "{{event.ruleName}}"',
        },
      },
      {
        id: 'step2',
        connectorName: 'slow-console',
        connectorType: 'console',
        inputs: {
          message: 'Step 2 executed "{{event.additionalData.user}}"',
        },
      },
      {
        id: 'step3',
        needs: ['step1', 'step2'],
        connectorType: 'slack-connector',
        connectorName: 'slack_keep',
        inputs: {
          message:
            'Message from step 3: Detection rule name is "{{event.ruleName}}" and user is "{{event.additionalData.user}}" and workflowRunId is "{{workflowRunId}}"',
        },
      },
      {
        id: 'step4',
        needs: ['step3'],
        connectorName: 'console',
        connectorType: 'console',
        inputs: {
          message: 'Step 4 executed!',
        },
      },
    ],
  },
];

export const workflowsGrouppedByTriggerType = workflows.reduce((acc, workflow) => {
  const triggerType = workflow.triggers[0].type;
  if (!acc[triggerType]) {
    acc[triggerType] = [];
  }
  acc[triggerType].push(workflow);
  return acc;
}, {} as Record<string, WorkflowExecutionEngineModel[]>);
