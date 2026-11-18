/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isAxiosError } from 'axios';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext } from '../../connector_spec';

const SSM_TARGET_PREFIX = 'AmazonSSM';

type SsmOperation =
  | 'CancelCommand'
  | 'DescribeInstanceInformation'
  | 'GetAutomationExecution'
  | 'GetCommandInvocation'
  | 'GetDocument'
  | 'GetParameter'
  | 'ListCommands'
  | 'ListDocuments'
  | 'SendCommand'
  | 'StartAutomationExecution'
  | 'StopAutomationExecution';

const regionConfigSchema = lazySchema(() => z.object({ region: z.string().min(1) }));

// AWS JSON protocol error body; `__type` is either `<namespace>#<ErrorCode>` or the bare code.
// The code may come in the `x-amzn-ErrorType` header instead, as `<ErrorCode>:<url>`.
const awsJsonErrorSchema = lazySchema(() =>
  z.object({
    __type: z.string().optional(),
    message: z.string().optional(),
    Message: z.string().optional(),
  })
);

const getRegion = (ctx: ActionContext): string => {
  const parsed = regionConfigSchema.safeParse(ctx.config);
  if (!parsed.success) {
    throw new Error('Connector is missing the required "region" configuration field.');
  }
  return parsed.data.region;
};

const toAwsJsonError = ({ target, error }: { target: string; error: unknown }): unknown => {
  if (!isAxiosError<unknown>(error)) {
    return error;
  }
  const parsed = awsJsonErrorSchema.safeParse(error.response?.data);
  const headerType = error.response?.headers['x-amzn-errortype'];
  const type =
    (typeof headerType === 'string' ? headerType : undefined) ??
    (parsed.success ? parsed.data.__type : undefined);
  const code = type?.split(':')[0].split('#').pop();
  const message = parsed.success ? parsed.data.message ?? parsed.data.Message : undefined;
  // The action executor reads the HTTP status and Retry-After from the Axios error, so reword it in place.
  error.message = `${target} failed${code ? ` (${code})` : ''}: ${message ?? error.message}`;
  return error;
};

/** Calls an AWS Systems Manager operation; SigV4 signing is done by the aws_credentials auth type. */
export const callSsmApi = async ({
  ctx,
  operation,
  body = {},
}: {
  ctx: ActionContext;
  operation: SsmOperation;
  body?: Record<string, unknown>;
}): Promise<unknown> => {
  const region = getRegion(ctx);
  const target = `${SSM_TARGET_PREFIX}.${operation}`;
  try {
    const { data } = await ctx.client.post<unknown>(
      `https://ssm.${region}.amazonaws.com/`,
      JSON.stringify(body),
      {
        headers: {
          // The SigV4 signer defaults to application/json when no Content-Type is set.
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': target,
        },
      }
    );
    return data;
  } catch (error) {
    throw toAwsJsonError({ target, error });
  }
};
