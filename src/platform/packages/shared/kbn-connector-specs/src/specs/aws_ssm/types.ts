/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// DescribeInstanceInformation returns 5-50 nodes per page.
const MAX_RESULTS_MIN = 5;
const MAX_RESULTS_MAX = 50;
// SSM documents no length limit for NextToken; this only guards against unbounded input.
const NEXT_TOKEN_MAX_LENGTH = 4096;
// An SSM filter takes at most 100 values.
const FILTER_VALUES_MAX = 100;
// The pattern SSM's model gives InstanceId: an EC2 instance (i-) or a hybrid managed node (mi-).
const INSTANCE_ID_PATTERN = /^(i-(\w{8}|\w{17})|mi-\w{17})$/;
const INSTANCE_ID_MAX_LENGTH = 20;
const TAG_KEY_MAX_LENGTH = 128;
const TAG_VALUE_MAX_LENGTH = 256;
// SSM documents no limit on the number of tag filters; this only guards against unbounded input.
const TAG_FILTERS_MAX = 10;

const PING_STATUSES = ['Online', 'ConnectionLost', 'Inactive'] as const;
const PLATFORM_TYPES = ['Windows', 'Linux', 'MacOS'] as const;

export const DescribeInstanceInformationInputSchema = lazySchema(() =>
  z
    .object({
      instanceIds: z
        .array(
          z
            .string()
            .max(INSTANCE_ID_MAX_LENGTH)
            .regex(
              INSTANCE_ID_PATTERN,
              'Must be an EC2 instance ID (i-...) or a managed node ID (mi-...).'
            )
        )
        .min(1)
        .max(FILTER_VALUES_MAX)
        .optional()
        .describe(
          'Only return these nodes, by EC2 instance ID (e.g. i-0123456789abcdef0) or hybrid managed node ID (e.g. mi-0123456789abcdef0).'
        ),
      pingStatus: z
        .array(z.enum(PING_STATUSES))
        .min(1)
        .max(PING_STATUSES.length)
        .optional()
        .describe(
          'Only return nodes whose SSM Agent is in one of these states. Use ["Online"] for nodes that are reachable now.'
        ),
      platformType: z
        .array(z.enum(PLATFORM_TYPES))
        .min(1)
        .max(PLATFORM_TYPES.length)
        .optional()
        .describe('Only return nodes running one of these operating system families.'),
      tags: z
        .array(
          z.object({
            key: z.string().min(1).max(TAG_KEY_MAX_LENGTH).describe('Tag key, e.g. Environment.'),
            values: z
              .array(z.string().min(1).max(TAG_VALUE_MAX_LENGTH))
              .min(1)
              .max(FILTER_VALUES_MAX)
              .describe('Tag values to match; a node matches when its tag has any of them.'),
          })
        )
        .min(1)
        .max(TAG_FILTERS_MAX)
        .optional()
        .describe(
          'Only return nodes that have every one of these tags. Cannot be combined with instanceIds, pingStatus or platformType.'
        ),
      maxResults: z
        .number()
        .int()
        .min(MAX_RESULTS_MIN)
        .max(MAX_RESULTS_MAX)
        .optional()
        .describe(
          `Maximum number of nodes to return (${MAX_RESULTS_MIN}-${MAX_RESULTS_MAX}). Defaults to 10.`
        ),
      nextToken: z
        .string()
        .max(NEXT_TOKEN_MAX_LENGTH)
        .optional()
        .describe('Pagination token from a previous response. Omit to fetch the first page.'),
    })
    .refine(
      ({ tags, instanceIds, pingStatus, platformType }) =>
        tags === undefined ||
        (instanceIds === undefined && pingStatus === undefined && platformType === undefined),
      {
        message:
          'AWS Systems Manager cannot combine tag filters with other filters: use either "tags", or "instanceIds", "pingStatus" and "platformType".',
        path: ['tags'],
      }
    )
);
export type DescribeInstanceInformationInput = z.infer<
  typeof DescribeInstanceInformationInputSchema
>;

// The fields the connector returns; others are dropped by parsing. Enums stay plain strings so a
// value AWS adds later doesn't fail the action.
export const DescribeInstanceInformationResponseSchema = lazySchema(() =>
  z.object({
    InstanceInformationList: z
      .array(
        z.object({
          InstanceId: z.string().optional(),
          PingStatus: z.string().optional(),
          LastPingDateTime: z.number().optional(),
          PlatformType: z.string().optional(),
          PlatformName: z.string().optional(),
          AgentVersion: z.string().optional(),
          ComputerName: z.string().optional(),
          IPAddress: z.string().optional(),
        })
      )
      .optional(),
    NextToken: z.string().optional(),
  })
);
