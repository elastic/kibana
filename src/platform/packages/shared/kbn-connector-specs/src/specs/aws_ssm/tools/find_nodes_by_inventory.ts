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
import { inventoryFiltersSchema, nextTokenSchema, toInventoryFilters, toNextToken } from './shared';

const MAX_RESULTS_MAX = 50;
const INSTANCE_INFORMATION_TYPE = 'AWS:InstanceInformation';

const FindNodesByInventoryInputSchema = lazySchema(() =>
  z.object({
    filters: inventoryFiltersSchema(
      'The inventory attribute to compare, as <type>.<attribute>, e.g. AWS:Application.Name or AWS:InstanceInformation.PlatformName.'
    ).describe('Only return nodes matching every one of these filters.'),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_MAX)
      .optional()
      .describe(`Maximum number of nodes to return (1-${MAX_RESULTS_MAX}).`),
    nextToken: nextTokenSchema(),
  })
);
type FindNodesByInventoryInput = z.infer<typeof FindNodesByInventoryInputSchema>;

const FindNodesByInventoryResponseSchema = lazySchema(() =>
  z.object({
    Entities: z
      .array(
        z.object({
          Id: z.string().optional(),
          Data: z
            .record(
              z.string(),
              z.object({
                Content: z.array(z.record(z.string(), z.string())),
              })
            )
            .optional(),
        })
      )
      .optional(),
    NextToken: z.string().optional(),
  })
);

export const findNodesByInventory: ActionDefinition<FindNodesByInventoryInput> = {
  isTool: true,
  scope: 'read',
  description:
    'Find the managed nodes whose Systems Manager inventory matches filters, e.g. the nodes with a given application installed (AWS:Application.Name) or running a given platform (AWS:InstanceInformation.PlatformName), with their host name, platform and IP address. Only nodes with inventory collection set up are searched. Pass nextToken from the response as nextToken to fetch the next page. Use getInventory for the inventory entries of one node.',
  input: FindNodesByInventoryInputSchema,
  handler: async (ctx, { filters, maxResults, nextToken }) => {
    const data = await callSsmApi({
      ctx,
      operation: 'GetInventory',
      body: {
        Filters: toInventoryFilters(filters),
        // AWS does not document which inventory types it returns for each node without it.
        ResultAttributes: [{ TypeName: INSTANCE_INFORMATION_TYPE }],
        MaxResults: maxResults,
        NextToken: nextToken || undefined,
      },
    });
    const { Entities = [], NextToken } = FindNodesByInventoryResponseSchema.parse(data);
    return {
      nodes: Entities.map(({ Id, Data }) => {
        const { Content = [] } = Data?.[INSTANCE_INFORMATION_TYPE] ?? {};
        const [{ ComputerName, PlatformName, PlatformVersion, IpAddress, InstanceStatus } = {}] =
          Content;
        return {
          instanceId: Id,
          computerName: ComputerName,
          platformName: PlatformName,
          platformVersion: PlatformVersion,
          ipAddress: IpAddress,
          instanceStatus: InstanceStatus,
        };
      }),
      nextToken: toNextToken(NextToken),
    };
  },
};
