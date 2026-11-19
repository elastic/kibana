/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionDefinition } from '../../../connector_spec';
import { callSsmApi } from '../aws_ssm_api';
import { PARAMETER_NAME_MAX_LENGTH, toIsoDate } from './shared';

const GetParameterInputSchema = lazySchema(() =>
  z.object({
    name: z
      .string()
      .min(1)
      .max(PARAMETER_NAME_MAX_LENGTH)
      .describe(
        'The parameter name or path, e.g. "/myapp/prod/db-host". Append ":<version>" or ":<label>" to read a specific version, e.g. "/myapp/prod/db-host:3".'
      ),
  })
);
type GetParameterInput = z.infer<typeof GetParameterInputSchema>;

const GetParameterResponseSchema = lazySchema(() =>
  z.object({
    Parameter: z
      .object({
        Name: z.string().optional(),
        Type: z.string().optional(),
        Value: z.string().optional(),
        Version: z.number().optional(),
        LastModifiedDate: z.number().optional(),
        DataType: z.string().optional(),
      })
      .optional(),
  })
);

export const getParameter: ActionDefinition<GetParameterInput> = {
  // SecureString values are never decrypted: a decrypted secret would land in the agent's
  // context and conversation history.
  isTool: true,
  scope: 'read',
  description:
    'Read a Parameter Store parameter by name: its type (String, StringList or SecureString), value, version, data type and when it was last changed. StringList values are comma-separated. SecureString values are never decrypted: their value is returned as null. Secrets Manager references (/aws/reference/secretsmanager/...) are not supported.',
  input: GetParameterInputSchema,
  handler: async (ctx, { name }) => {
    const data = await callSsmApi({
      ctx,
      operation: 'GetParameter',
      body: { Name: name, WithDecryption: false },
    });
    const { Parameter = {} } = GetParameterResponseSchema.parse(data);
    const { Name, Type, Value, Version, LastModifiedDate, DataType } = Parameter;
    return {
      name: Name,
      type: Type,
      // Without decryption SSM returns the ciphertext, which is of no use to the caller.
      value: Type === 'SecureString' ? null : Value,
      version: Version,
      dataType: DataType,
      lastModifiedDate: toIsoDate(LastModifiedDate),
    };
  },
};
