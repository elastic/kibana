/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema, isoDateTime } from '@kbn/zod/v4';

/** `Orion.AlertConfigurations.Severity` values, indexed by their numeric code. */
export const SOLARWINDS_SEVERITIES = [
  'information',
  'warning',
  'critical',
  'serious',
  'notice',
] as const;

/** `Orion.Nodes.Status` codes for the statuses a triage workflow filters on. */
export const SOLARWINDS_NODE_STATUSES = {
  unknown: 0,
  up: 1,
  down: 2,
  warning: 3,
  unmanaged: 9,
  unreachable: 12,
  critical: 14,
} as const;
type SolarWindsNodeStatus = keyof typeof SOLARWINDS_NODE_STATUSES;
const NODE_STATUS_NAMES = Object.keys(SOLARWINDS_NODE_STATUSES) as [
  SolarWindsNodeStatus,
  ...SolarWindsNodeStatus[]
];

const MAX_PAGE_SIZE = 500;
const MAX_QUERY_PARAMETERS = 50;
const MAX_ACKNOWLEDGE_IDS = 100;

const SwqlIdentifierSchema = lazySchema(() =>
  z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[A-Za-z_][A-Za-z0-9_]*$/,
      'Must be a letter or underscore followed by letters, digits, or underscores'
    )
);

const SwqlParameterValueSchema = lazySchema(() =>
  z.union([z.string().max(4000), z.number(), z.boolean(), z.null()])
);

const IdSchema = lazySchema(() => z.number().int().positive());

// Fields with a default are built per use: a shared instance becomes a JSON schema $ref,
// and the workflow editor then reports the field as required.
const limitField = () =>
  z
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(50)
    .describe(`Maximum number of rows to return (1-${MAX_PAGE_SIZE}). Defaults to 50.`);

const offsetField = () =>
  z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(
      'Number of rows to skip, for paging. Pass the nextOffset value from the previous call. Defaults to 0.'
    );

export const QueryInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .min(1)
      .max(10000)
      .describe(
        'A SWQL SELECT statement. Reference parameters as @name. Use TOP or WITH ROWS to limit the result size. Example: "SELECT TOP 10 NodeID, Caption, Status FROM Orion.Nodes WHERE Vendor = @vendor"'
      ),
    parameters: z
      .record(SwqlIdentifierSchema, SwqlParameterValueSchema)
      .refine((value) => Object.keys(value).length <= MAX_QUERY_PARAMETERS, {
        message: `At most ${MAX_QUERY_PARAMETERS} parameters are allowed`,
      })
      .optional()
      .describe(
        'Named parameters for the query, without the @ prefix. Values must be a string, number, boolean, or null. For IN, use one parameter per value: "IN (@id0, @id1)". Example: { "vendor": "Cisco", "id0": 1, "id1": 2 }'
      ),
  })
);
export type QueryInput = z.infer<typeof QueryInputSchema>;

export const ListActiveAlertsInputSchema = lazySchema(() =>
  z.object({
    severities: z
      .array(z.enum(SOLARWINDS_SEVERITIES))
      .min(1)
      .max(SOLARWINDS_SEVERITIES.length)
      .optional()
      .describe(
        'Only return alerts with one of these severities: "information", "warning", "critical", "serious", or "notice".'
      ),
    acknowledged: z
      .boolean()
      .optional()
      .describe('true returns only acknowledged alerts, false only unacknowledged alerts.'),
    triggeredAfter: isoDateTime({ offset: true })
      .max(64)
      .optional()
      .describe(
        'Only return alerts triggered after this ISO 8601 time, e.g. 2026-10-05T08:00:00Z. A time with an offset is converted to UTC.'
      ),
    alertName: z
      .string()
      .min(1)
      .max(255)
      .optional()
      .describe(
        'Only return alerts whose alert definition name contains this text, e.g. "Node is down".'
      ),
    nodeId: IdSchema.optional().describe(
      'Only return alerts on this node or on objects of this node (interfaces, volumes). NodeID from getNode or searchNodes.'
    ),
    limit: limitField(),
    offset: offsetField(),
  })
);
export type ListActiveAlertsInput = z.infer<typeof ListActiveAlertsInputSchema>;

export const GetAlertInputSchema = lazySchema(() =>
  z
    .object({
      alertActiveId: IdSchema.optional().describe(
        'The alertActiveId of the alert, from listActiveAlerts.'
      ),
      alertObjectId: IdSchema.optional().describe(
        'The alertObjectId of the alert, from listActiveAlerts or a SolarWinds alert action.'
      ),
    })
    .refine((v) => (v.alertActiveId === undefined) !== (v.alertObjectId === undefined), {
      message: 'Provide exactly one of alertActiveId or alertObjectId',
    })
);
export type GetAlertInput = z.infer<typeof GetAlertInputSchema>;

export const AcknowledgeAlertInputSchema = lazySchema(() =>
  z.object({
    alertObjectIds: z
      .array(IdSchema)
      .min(1)
      .max(MAX_ACKNOWLEDGE_IDS)
      .describe(
        `The alertObjectId values of the alerts to acknowledge (1-${MAX_ACKNOWLEDGE_IDS}), from listActiveAlerts or getAlert. Not the alertActiveId.`
      ),
    note: z
      .string()
      .max(4000)
      .optional()
      .describe(
        'A note to save with the acknowledgement, e.g. "Acknowledged by Elastic workflow. ServiceNow incident INC0012345."'
      ),
  })
);
export type AcknowledgeAlertInput = z.infer<typeof AcknowledgeAlertInputSchema>;

export const GetNodeInputSchema = lazySchema(() =>
  z
    .object({
      nodeId: IdSchema.optional().describe('The SolarWinds NodeID.'),
      ipAddress: z
        .union([z.ipv4().max(15), z.ipv6().max(45)])
        .optional()
        .describe('The polling IP address of the node, e.g. 10.0.0.1.'),
      caption: z
        .string()
        .min(1)
        .max(255)
        .optional()
        .describe('The exact node name (Caption) as shown in SolarWinds, e.g. "core-sw-01".'),
    })
    .refine(
      (v) => [v.nodeId, v.ipAddress, v.caption].filter((value) => value !== undefined).length === 1,
      { message: 'Provide exactly one of nodeId, ipAddress, or caption' }
    )
);
export type GetNodeInput = z.infer<typeof GetNodeInputSchema>;

export const SearchNodesInputSchema = lazySchema(() =>
  z.object({
    search: z
      .string()
      .min(1)
      .max(255)
      .optional()
      .describe(
        'Text to find in the node name, IP address, DNS name, or system name, e.g. "core-sw" or "10.20.".'
      ),
    statuses: z
      .array(z.enum(NODE_STATUS_NAMES))
      .min(1)
      .max(NODE_STATUS_NAMES.length)
      .optional()
      .describe(
        'Only return nodes with one of these statuses: "up", "down", "warning", "critical", "unreachable", "unmanaged", or "unknown".'
      ),
    vendor: z
      .string()
      .min(1)
      .max(100)
      .optional()
      .describe('Text to find in the vendor name, e.g. "Cisco".'),
    machineType: z
      .string()
      .min(1)
      .max(255)
      .optional()
      .describe('Text to find in the device model (MachineType), e.g. "Catalyst 9300".'),
    customProperty: z
      .object({
        name: SwqlIdentifierSchema.describe(
          'The node custom property name, e.g. "Site" or "DeviceRole". getNode returns the names that exist.'
        ),
        value: z.string().max(1000).describe('The exact value to match, e.g. "Abu Dhabi".'),
      })
      .optional()
      .describe('Only return nodes whose custom property has this exact value.'),
    limit: limitField(),
    offset: offsetField(),
  })
);
export type SearchNodesInput = z.infer<typeof SearchNodesInputSchema>;
