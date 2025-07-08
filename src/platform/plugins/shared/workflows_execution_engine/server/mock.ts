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
        providerName: 'console',
        inputs: {
          message: 'Step 1 executed "{{event.ruleName}}"',
        },
      },
      {
        id: 'step2',
        providerName: 'slow-console',
        inputs: {
          message: 'Step 2 executed "{{event.additionalData.user}}"',
        },
      },
      {
        id: 'step3',
        needs: ['step1', 'step2'],
        providerName: 'console',
        inputs: {
          message: 'Step 3 executed',
        },
      },
      {
        id: 'step4',
        needs: ['step3'],
        providerName: 'console',
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
