import { Workflow, Provider } from './models';

export const providers: Record<string, Provider> = {
  console: {
    type: 'console',
    action: async (stepInputs?: Record<string, any>, context?: Record<string, any>) => {
      function getValueByPath(path: string, obj: Record<string, any>): any {
        return path.split('.').reduce((acc, key) => {
          if (acc && typeof acc === 'object' && key in acc) {
            return acc[key];
          }
          return undefined;
        }, obj);
      }

      function injectVariables(template: string, context: Record<string, any>): string {
        return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, path) => {
          const value = getValueByPath(path.trim(), context);
          return value !== undefined ? String(value) : '';
        });
      }

      // Usage
      const messageTemplate = stepInputs?.message as string;
      const contextObject = context || {};

      const finalMessage = injectVariables(messageTemplate, contextObject);

      // eslint-disable-next-line no-console
      console.log(finalMessage);
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
    action: async (stepInputs?: Record<string, any>, context?: Record<string, any>) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      function getValueByPath(path: string, obj: Record<string, any>): any {
        return path.split('.').reduce((acc, key) => {
          if (acc && typeof acc === 'object' && key in acc) {
            return acc[key];
          }
          return undefined;
        }, obj);
      }

      function injectVariables(template: string, ctx: Record<string, any>): string {
        return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, path) => {
          const value = getValueByPath(path.trim(), ctx);
          return value !== undefined ? String(value) : '';
        });
      }

      // Usage
      const messageTemplate = stepInputs?.message as string;
      const contextObject = context || {};

      const finalMessage = injectVariables(messageTemplate, contextObject);

      // eslint-disable-next-line no-console
      console.log(finalMessage);
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

export const workflows: Record<string, Workflow[]> = (
  [
    {
      id: 'example-workflow-1',
      name: 'Example Workflow 1',
      trigger: 'detection-rule',
      steps: {
        step1: {
          id: 'step1',
          providerName: 'console',
          inputs: {
            message: 'Step 1 executed "{{event.ruleName}}"',
          },
        },
        step2: {
          id: 'step2',
          providerName: 'slow-console',
          inputs: {
            message: 'Step 2 executed "{{event.additionalData.user}}"',
          },
        },
        step3: {
          id: 'step3',
          needs: ['step1', 'step2'],
          providerName: 'console',
          inputs: {
            message: 'Step 3 executed',
          },
        },
        step4: {
          id: 'step4',
          needs: ['step3'],
          providerName: 'console',
          inputs: {
            message: 'Step 4 executed!',
          },
        },
      },
    },
  ] as Workflow[]
).reduce(
  (acc, workflow) => ({
    [workflow.trigger]: [...((acc[workflow.trigger] || []) as []), workflow],
  }),
  {}
);
