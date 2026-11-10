/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const MAX_STRING_LENGTH = 4096;
const MAX_PATH_LENGTH = 2048;
const MAX_HOST_LABEL_LENGTH = 63;

export const RequestInputSchema = lazySchema(() =>
  z.object({
    service: z
      .string()
      .max(MAX_HOST_LABEL_LENGTH)
      .regex(/^[a-z0-9][a-z0-9-]*$/)
      .describe(
        'AWS endpoint prefix, used as the first label of the hostname and, unless "signingName" is set, as the SigV4 signing name. ' +
          'Examples: "iam", "sts", "ec2", "s3", "logs", "securityhub", "guardduty".'
      ),
    signingName: z
      .string()
      .max(MAX_HOST_LABEL_LENGTH)
      .regex(/^[a-z0-9][a-z0-9-]*$/)
      .optional()
      .describe(
        'SigV4 signing name, when it differs from the endpoint prefix in "service" ' +
          '(for example "bedrock" for service "bedrock-runtime"). Defaults to the service.'
      ),
    region: z
      .string()
      .max(MAX_HOST_LABEL_LENGTH)
      .regex(/^[a-z]{2}(-[a-z]+)+-\d+$/)
      .refine((region) => !region.startsWith('cn-'), 'China (cn-*) regions are not supported')
      .optional()
      .describe(
        'AWS region, e.g. "us-east-1". The request goes to {service}.{region}.amazonaws.com. ' +
          'Omit it for global endpoints such as IAM, which go to {service}.amazonaws.com and are signed in us-east-1. ' +
          'China (cn-*) regions are not supported.'
      ),
    method: z
      .enum(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'])
      .default('GET')
      .describe('HTTP method.'),
    path: z
      .string()
      .max(MAX_PATH_LENGTH)
      .startsWith('/')
      .default('/')
      .describe(
        'Request path, starting with a slash. Query-protocol APIs (IAM, STS, EC2) use "/". ' +
          'Example for Lambda: "/2015-03-31/functions".'
      ),
    query: z
      .record(z.string().max(MAX_STRING_LENGTH), z.string().max(MAX_STRING_LENGTH))
      .optional()
      .describe(
        'Query parameters. They are included in the signature. ' +
          'Example: { "Action": "ListUsers", "Version": "2010-05-08" }.'
      ),
    headers: z
      .record(z.string().max(MAX_STRING_LENGTH), z.string().max(MAX_STRING_LENGTH))
      .optional()
      .describe(
        'Extra request headers. Set Content-Type for non-JSON bodies, e.g. ' +
          '"application/x-www-form-urlencoded; charset=utf-8" for Query-protocol APIs, or ' +
          '"application/x-amz-json-1.1" with X-Amz-Target for JSON-protocol APIs, e.g. ' +
          '{ "Content-Type": "application/x-amz-json-1.1", "X-Amz-Target": "Logs_20140328.DescribeLogGroups" }. ' +
          'x-amz-* headers are signed.'
      ),
    body: z
      .unknown()
      .optional()
      .describe(
        'Request body. A string is sent as-is (e.g. a form-encoded Query-protocol body); any other value is sent as JSON, ' +
          'e.g. { "limit": 5 } for CloudWatch Logs DescribeLogGroups.'
      ),
  })
);
export type RequestInput = z.infer<typeof RequestInputSchema>;
