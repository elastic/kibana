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
import {
  instanceIdSchema,
  inventoryFiltersSchema,
  inventoryTypeNameSchema,
  nextTokenSchema,
  toInventoryFilters,
  toNextToken,
} from './shared';

const MAX_RESULTS_MAX = 50;

const GetInventoryInputSchema = lazySchema(() =>
  z.object({
    instanceId: instanceIdSchema().describe(
      'The managed node to read, by EC2 instance ID (e.g. i-0123456789abcdef0) or hybrid managed node ID (e.g. mi-0123456789abcdef0).'
    ),
    typeName: inventoryTypeNameSchema().describe(
      'The kind of inventory to read, e.g. AWS:Application (installed software), AWS:WindowsUpdate (installed Windows updates), AWS:PatchSummary and AWS:ComplianceItem (patch compliance, after a Patch Manager scan), AWS:Network, AWS:Service, AWS:Tag or AWS:InstanceDetailedInformation.'
    ),
    filters: inventoryFiltersSchema(
      'The attribute of the inventory entries to compare, e.g. Name or Version for AWS:Application.'
    )
      .optional()
      .describe('Only return entries matching every one of these filters.'),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(MAX_RESULTS_MAX)
      .optional()
      .describe(`Maximum number of entries to return (1-${MAX_RESULTS_MAX}).`),
    nextToken: nextTokenSchema(),
  })
);
type GetInventoryInput = z.infer<typeof GetInventoryInputSchema>;

const GetInventoryResponseSchema = lazySchema(() =>
  z.object({
    CaptureTime: z.string().optional(),
    Entries: z.array(z.record(z.string(), z.string())).optional(),
    NextToken: z.string().optional(),
  })
);

export const getInventory: ActionDefinition<GetInventoryInput> = {
  isTool: true,
  scope: 'read',
  description:
    'Read the inventory Systems Manager collected from one managed node, such as its installed software, Windows updates or compliance items, with the time it was collected. Filter the entries, e.g. by Name for AWS:Application. Returns no entries when inventory collection is not set up for the node. Pass nextToken from the response as nextToken to fetch the next page. To find which nodes have some software installed, use findNodesByInventory.',
  input: GetInventoryInputSchema,
  handler: async (ctx, { instanceId, typeName, filters, maxResults, nextToken }) => {
    const data = await callSsmApi({
      ctx,
      operation: 'ListInventoryEntries',
      body: {
        InstanceId: instanceId,
        TypeName: typeName,
        Filters: filters ? toInventoryFilters(filters) : undefined,
        MaxResults: maxResults,
        NextToken: nextToken,
      },
    });
    const { CaptureTime, Entries = [], NextToken } = GetInventoryResponseSchema.parse(data);
    return {
      captureTime: CaptureTime ?? null,
      entries: Entries,
      nextToken: toNextToken(NextToken),
    };
  },
};
