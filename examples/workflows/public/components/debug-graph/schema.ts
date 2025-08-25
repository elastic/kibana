import type { ConnectorContract } from '@kbn/workflows';
import { generateYamlSchemaFromConnectors } from '@kbn/workflows';
import { z } from '@kbn/zod';

const connectors: ConnectorContract[] = [
  {
    type: 'console',
    paramsSchema: z
      .object({
        message: z.string(),
      })
      .required(),
    outputSchema: z.string(),
  },
  {
    type: 'slack',
    connectorIdRequired: true,
    paramsSchema: z
      .object({
        message: z.string(),
      })
      .required(),
    outputSchema: z.object({
      message: z.string(),
    }),
  },
  {
    type: 'inference.unified_completion',
    connectorIdRequired: true,
    paramsSchema: z
      .object({
        body: z.object({
          messages: z.array(
            z.object({
              role: z.string(),
              content: z.string(),
            })
          ),
        }),
      })
      .required(),
    // TODO: use UnifiedChatCompleteResponseSchema from stack_connectors/common/inference/schema.ts
    outputSchema: z.object({
      id: z.string(),
      choices: z.array(
        z.object({
          message: z.object({
            content: z.string(),
            role: z.string(),
          }),
        })
      ),
    }),
  },
  {
    type: 'inference.completion',
    connectorIdRequired: true,
    paramsSchema: z.object({
      input: z.string(),
    }),
    outputSchema: z.array(
      z.object({
        result: z.string(),
      })
    ),
  },
];

export const getOutputSchemaForStepType = (stepType: string) => {
  return connectors.find((c) => c.type === stepType)?.outputSchema ?? z.any();
};

export const WORKFLOW_ZOD_SCHEMA = generateYamlSchemaFromConnectors(connectors);
export const WORKFLOW_ZOD_SCHEMA_LOOSE = generateYamlSchemaFromConnectors(connectors, true);
