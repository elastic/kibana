/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ActionDefinition } from '../../../connector_spec';
import { callSsmApi, isAwsError } from '../aws_ssm_api';
import { PARAMETER_NAME_MAX_LENGTH } from './shared';

// An advanced parameter holds up to 8 KB; AWS rejects values over 4 KB for standard ones.
const PARAMETER_VALUE_MAX_LENGTH = 8192;
const PARAMETER_DESCRIPTION_MAX_LENGTH = 1024;

// SecureString is left out: the secret would pass through the agent's context and conversation history.
const WRITABLE_PARAMETER_TYPES = ['String', 'StringList'] as const;

const PutParameterInputSchema = lazySchema(() =>
  z.object({
    name: z
      .string()
      .min(1)
      .max(PARAMETER_NAME_MAX_LENGTH)
      .describe('The parameter name or path, e.g. "/myapp/prod/feature-flag".'),
    value: z
      .string()
      .min(1)
      .max(PARAMETER_VALUE_MAX_LENGTH)
      .describe(
        "The value to store, up to 4,096 characters, or 8,192 if the account's default parameter tier is Advanced or Intelligent-Tiering. For a StringList, separate the items with commas."
      ),
    type: z
      .enum(WRITABLE_PARAMETER_TYPES)
      .describe('String for a single value, StringList for comma-separated items.'),
    description: z
      .string()
      .max(PARAMETER_DESCRIPTION_MAX_LENGTH)
      .optional()
      .describe('What the parameter is for.'),
    overwrite: z
      .boolean()
      .optional()
      .describe(
        'Set to true to replace the value of an existing parameter. Without it, writing to an existing parameter fails with ParameterAlreadyExists.'
      ),
  })
);
type PutParameterInput = z.infer<typeof PutParameterInputSchema>;

const PutParameterResponseSchema = lazySchema(() =>
  z.object({
    Version: z.number().optional(),
    Tier: z.string().optional(),
  })
);

const ExistingParameterSchema = lazySchema(() =>
  z.object({ Parameter: z.object({ Type: z.string().optional() }).optional() })
);

const getExistingParameterType = async ({
  ctx,
  name,
}: {
  ctx: ActionContext;
  name: string;
}): Promise<string | undefined> => {
  try {
    const data = await callSsmApi({
      ctx,
      operation: 'GetParameter',
      body: { Name: name, WithDecryption: false },
    });
    return ExistingParameterSchema.parse(data).Parameter?.Type;
  } catch (error) {
    if (isAwsError({ error, code: 'ParameterNotFound' })) {
      return undefined;
    }
    throw error;
  }
};

export const putParameter: ActionDefinition<PutParameterInput> = {
  isTool: true,
  scope: 'destroy',
  description:
    'Create a String or StringList Parameter Store parameter, or replace the value of an existing one with overwrite: true. Returns the new version number. SecureString parameters cannot be written or overwritten. Confirm the name and value with the user before overwriting: the previous value is only kept in the parameter history.',
  input: PutParameterInputSchema,
  handler: async (ctx, { name, value, type, description, overwrite }) => {
    // AWS turns a SecureString overwritten with Type String into a plaintext parameter.
    if (overwrite && (await getExistingParameterType({ ctx, name })) === 'SecureString') {
      throw new Error(
        `${name} is a SecureString parameter, which this connector cannot overwrite.`
      );
    }
    const data = await callSsmApi({
      ctx,
      operation: 'PutParameter',
      body: {
        Name: name,
        Value: value,
        Type: type,
        Description: description,
        Overwrite: overwrite,
      },
    });
    const { Version, Tier } = PutParameterResponseSchema.parse(data);
    return { name, version: Version, tier: Tier };
  },
};
