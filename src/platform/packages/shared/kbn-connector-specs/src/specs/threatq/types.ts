/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const queryValue = (depth: number): z.ZodType<JsonValue> => {
  const scalar = z.union([z.string().max(2000), z.number(), z.boolean(), z.null()]);
  if (depth === 0) return scalar;
  const child = queryValue(depth - 1);
  return z.union([
    scalar,
    z.array(child).max(50),
    z.record(z.string().min(1).max(100), child).refine((value) => Object.keys(value).length <= 50),
  ]);
};

const QuerySchema = lazySchema(() =>
  z
    .record(z.string().min(1).max(100), queryValue(5))
    .refine((value) => Object.keys(value).length <= 50)
    .refine(
      (value) => JSON.stringify(value).length <= 20000,
      'Query must not exceed 20,000 characters'
    )
);
const IdSchema = lazySchema(() => z.number().int().positive().max(Number.MAX_SAFE_INTEGER));
const WithSchema = lazySchema(() =>
  z
    .array(
      z
        .string()
        .min(1)
        .max(100)
        .regex(/^[a-zA-Z][a-zA-Z0-9_.]*$/)
    )
    .max(30)
    .describe(
      'Related fields to include, for example ["attributes", "sources", "score"]. Sent as a comma-separated with parameter. Names depend on the object and ThreatQ version.'
    )
);
const ObjectTypeSchema = lazySchema(() =>
  z
    .enum([
      'adversaries',
      'attachments',
      'attack_pattern',
      'campaign',
      'course_of_action',
      'events',
      'exploit_target',
      'identity',
      'incident',
      'indicators',
      'intrusion_set',
      'malware',
      'report',
      'signatures',
      'tasks',
      'tool',
      'ttp',
      'vulnerability',
    ])
    .describe(
      'ThreatQ object endpoint name, for example indicators, adversaries, events, or report (singular).'
    )
);
const CoreObjectSchema = lazySchema(() => z.enum(['indicators', 'events', 'adversaries']));
const SourcesSchema = lazySchema(() =>
  z
    .array(
      z.object({
        name: z.string().min(1).max(200).describe('Source name, for example Elastic Security.'),
        tlp: z
          .object({
            name: z
              .enum(['WHITE', 'GREEN', 'AMBER', 'RED', 'CLEAR', 'AMBER+STRICT'])
              .describe('Traffic Light Protocol label supported by the target ThreatQ version.'),
          })
          .optional()
          .describe('Optional source sharing restriction, for example {"name":"AMBER"}.'),
        published_at: z
          .string()
          .max(19)
          .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
          .optional()
          .describe('Optional source publication time in UTC, formatted YYYY-MM-DD HH:mm:ss.'),
      })
    )
    .max(50)
    .describe('Optional source records for the submitted intelligence; at most 50.')
);

export const PaginationSchema = lazySchema(() =>
  z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .default(50)
      .describe('Maximum records per page, from 1 to 500; defaults to 50.'),
    offset: z
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER)
      .default(0)
      .describe('Number of records to skip; defaults to 0.'),
    sort: z
      .string()
      .min(1)
      .max(200)
      .regex(/^-?[a-zA-Z_][a-zA-Z0-9_.]*(,-?[a-zA-Z_][a-zA-Z0-9_.]*)*$/)
      .optional()
      .describe('Optional comma-separated sort fields, for example id or -created_at,id.'),
  })
);
export const SearchIndicatorsInputSchema = lazySchema(() =>
  PaginationSchema.extend({
    criteria: QuerySchema.optional().describe(
      'ThreatQ search criteria, for example {"value":{"+contains":"example.com"}}. Supports nested +and and +or operators; at most 20,000 characters.'
    ),
    filters: QuerySchema.optional().describe(
      'ThreatQ filters, for example {"+and":[{"type_name":"FQDN"},{"status_name":"Active"},{"score":{"+gte":6}}]}. At most 20,000 characters.'
    ),
  })
);
export const SearchObjectsInputSchema = lazySchema(() =>
  SearchIndicatorsInputSchema.extend({
    objectType: ObjectTypeSchema.or(z.literal('reports')).describe(
      'Threat Library search endpoint name, for example indicators, adversaries, or reports. The API reference uses reports for searches; some instance object definitions use report.'
    ),
    cursorMark: z
      .string()
      .min(1)
      .max(2000)
      .optional()
      .describe(
        'Optional cursor for large searches. Start with *, then use nextCursorMark. Overrides offset; stop when the returned cursor does not change.'
      ),
  })
);
export const GetIndicatorInputSchema = lazySchema(() =>
  z.object({
    indicatorId: IdSchema.describe('Indicator ID from searchIndicators, for example 123.'),
    with: WithSchema.default(['attributes', 'sources', 'score', 'status', 'adversaries', 'events']),
  })
);
export const GetObjectInputSchema = lazySchema(() =>
  z.object({
    objectType: ObjectTypeSchema,
    objectId: IdSchema.describe(
      'Object ID from searchObjects or a related object, for example 123.'
    ),
    with: WithSchema.optional(),
  })
);
export const GetRelatedObjectsInputSchema = lazySchema(() =>
  PaginationSchema.extend({
    objectType: CoreObjectSchema.describe(
      'Starting object type: indicators, events, or adversaries.'
    ),
    objectId: IdSchema.describe('Starting object ID, for example 123.'),
    relatedType: CoreObjectSchema.describe(
      'Related objects to retrieve: indicators, events, or adversaries.'
    ),
    with: WithSchema.optional(),
  })
);
export const CreateIndicatorInputSchema = lazySchema(() =>
  z.object({
    value: z
      .string()
      .min(1)
      .max(2000)
      .describe('Indicator value, for example example.com or 192.0.2.1.'),
    typeId: IdSchema.describe(
      'Indicator type ID from listIndicatorTypes; do not assume IDs are the same across instances.'
    ),
    statusId: IdSchema.describe(
      'Initial status ID from listIndicatorStatuses, for example the ID for Review.'
    ),
    sources: SourcesSchema.optional(),
  })
);
export const UpdateIndicatorStatusInputSchema = lazySchema(() =>
  z.object({
    indicatorId: IdSchema.describe('ID of the indicator to update, for example 123.'),
    statusId: IdSchema.describe(
      'Target status ID from listIndicatorStatuses. Only the status is updated.'
    ),
  })
);
export const AddAttributeInputSchema = lazySchema(() =>
  z.object({
    objectType: CoreObjectSchema.describe(
      'Object type to enrich: indicators, events, or adversaries.'
    ),
    objectId: IdSchema.describe('ID of the object to enrich, for example 123.'),
    name: z
      .string()
      .min(1)
      .max(200)
      .describe('Attribute name, for example Disposition or Confidence.'),
    value: z
      .string()
      .min(1)
      .max(10000)
      .describe(
        'Attribute value, for example High or a triage finding; at most 10,000 characters.'
      ),
    sources: SourcesSchema.optional(),
  })
);
export const CreateEventInputSchema = lazySchema(() =>
  z.object({
    title: z
      .string()
      .min(1)
      .max(500)
      .describe('Event title, for example Suspicious domain detected.'),
    type: z
      .string()
      .min(1)
      .max(200)
      .describe('Event type name configured in ThreatQ, for example Spearphish.'),
    happenedAt: z
      .string()
      .max(19)
      .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
      .describe('Event time in UTC, formatted YYYY-MM-DD HH:mm:ss.'),
    sources: SourcesSchema.optional(),
  })
);
export const CreateAdversaryInputSchema = lazySchema(() =>
  z.object({
    name: z.string().min(1).max(200).describe('Adversary name, for example Example Actor.'),
    sources: SourcesSchema.optional(),
  })
);
export const LinkObjectsInputSchema = lazySchema(() =>
  z.object({
    objectType: CoreObjectSchema.describe(
      'Starting object type: indicators, events, or adversaries.'
    ),
    objectId: IdSchema.describe('Starting object ID, for example 123.'),
    relatedType: CoreObjectSchema.describe(
      'Type of object to link: indicators, events, or adversaries.'
    ),
    relatedId: IdSchema.describe('ID of the existing object to link, for example 456.'),
  })
);
export const GetPluginInputSchema = lazySchema(() =>
  z.object({
    pluginId: IdSchema.describe(
      'Plugin ID from listPlugins. Returns its actions and supported object types.'
    ),
  })
);
export const ExecutePluginInputSchema = lazySchema(() =>
  z.object({
    pluginId: IdSchema.describe(
      'Plugin ID from listPlugins. The plugin must be configured and enabled in ThreatQ.'
    ),
    type: z
      .string()
      .min(1)
      .max(100)
      .describe('Case-sensitive object type from getPlugin, for example Indicator.'),
    objectId: IdSchema.describe('ID of the object passed to the plugin, for example 123.'),
    action: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'Plugin action name from getPlugin, for example whois. This can change data or call external services.'
      ),
  })
);

export type Pagination = z.infer<typeof PaginationSchema>;
export type SearchIndicatorsInput = z.infer<typeof SearchIndicatorsInputSchema>;
export type SearchObjectsInput = z.infer<typeof SearchObjectsInputSchema>;
export type GetIndicatorInput = z.infer<typeof GetIndicatorInputSchema>;
export type GetObjectInput = z.infer<typeof GetObjectInputSchema>;
export type GetRelatedObjectsInput = z.infer<typeof GetRelatedObjectsInputSchema>;
export type CreateIndicatorInput = z.infer<typeof CreateIndicatorInputSchema>;
export type UpdateIndicatorStatusInput = z.infer<typeof UpdateIndicatorStatusInputSchema>;
export type AddAttributeInput = z.infer<typeof AddAttributeInputSchema>;
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;
export type CreateAdversaryInput = z.infer<typeof CreateAdversaryInputSchema>;
export type LinkObjectsInput = z.infer<typeof LinkObjectsInputSchema>;
export type GetPluginInput = z.infer<typeof GetPluginInputSchema>;
export type ExecutePluginInput = z.infer<typeof ExecutePluginInputSchema>;
