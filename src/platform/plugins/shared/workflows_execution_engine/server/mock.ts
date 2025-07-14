import { Provider } from '@kbn/workflows';

export const connectors: Record<string, Provider> = {
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
  delay: {
    type: 'delay',
    action: async (stepInputs?: Record<string, any>) => {
      if (!stepInputs?.delay) {
        throw new Error('Delay input is required');
      }

      await new Promise((resolve) => setTimeout(resolve, stepInputs.delay));
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
