/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// ============================================================================
// Shared building blocks
// ============================================================================

/** A generic JSON object with a bounded key length and entry count, used for
 * fields whose shape is defined by the vendor's own nested DSL (query bodies,
 * monitor inputs/triggers, documents) rather than a fixed set of properties. */
const boundedRecord = (maxEntries: number) =>
  z
    .record(z.string().max(200), z.unknown())
    .refine((value) => Object.keys(value).length <= maxEntries, {
      message: `Must contain at most ${maxEntries} top-level keys.`,
    });

const MonitorIdSchema = z
  .string()
  .min(1)
  .max(200)
  .describe('The OpenSearch Alerting monitor ID, e.g. as returned by searchMonitors or getAlerts.');

const DetectorIdSchema = z
  .string()
  .min(1)
  .max(200)
  .describe(
    'The Security Analytics detector ID, e.g. as returned by getDetectorFindings or the OpenSearch Dashboards detector list.'
  );

const AlertIdsSchema = z
  .array(z.string().min(1).max(200))
  .min(1)
  .max(100)
  .describe(
    'One or more alert IDs to acknowledge. Only alerts currently in the ACTIVE state are acknowledged; alerts already ERROR, COMPLETED, or ACKNOWLEDGED are reported back as failed.'
  );

export const AlertStateSchema = z
  .enum(['ALL', 'ACTIVE', 'ACKNOWLEDGED', 'COMPLETED', 'ERROR'])
  .describe('Filter by alert state. Defaults to "ALL".');

const SortOrderSchema = z.enum(['asc', 'desc']).describe('Sort order: "asc" or "desc".');

const MonitorTypeSchema = z
  .enum(['query_level_monitor', 'bucket_level_monitor', 'doc_level_monitor'])
  .describe(
    'The monitor type: "query_level_monitor" (a single search query with a script-based trigger condition), ' +
      '"bucket_level_monitor" (aggregates results into buckets and evaluates each bucket), or ' +
      '"doc_level_monitor" (matches individual documents against percolator-style queries).'
  );

const ScheduleSchema = lazySchema(() =>
  z
    .object({
      period: z
        .object({
          interval: z.number().int().min(1).describe('The run interval, e.g. 5.'),
          unit: z
            .enum(['MINUTES', 'HOURS', 'DAYS'])
            .describe('The unit for "interval": "MINUTES", "HOURS", or "DAYS".'),
        })
        .optional()
        .describe('A fixed-interval schedule, e.g. { interval: 5, unit: "MINUTES" }.'),
      cron: z
        .object({
          expression: z
            .string()
            .min(1)
            .max(100)
            .describe('A standard cron expression, e.g. "10 12 1 * *".'),
          timezone: z
            .string()
            .max(64)
            .optional()
            .describe('An IANA time zone name, e.g. "America/Los_Angeles". Defaults to UTC.'),
        })
        .optional()
        .describe('A cron-based schedule, e.g. { expression: "10 12 1 * *", timezone: "UTC" }.'),
    })
    .refine((value) => Boolean(value.period) !== Boolean(value.cron), {
      message: 'Specify exactly one of "period" or "cron".',
    })
    .describe(
      'The monitor run schedule. Provide either "period" (a fixed interval) or "cron" (a cron expression), not both.'
    )
);
export type Schedule = z.infer<typeof ScheduleSchema>;

const MonitorInputsSchema = lazySchema(() =>
  z
    .array(boundedRecord(30))
    .max(10)
    .describe(
      "The monitor's search input(s), following the OpenSearch monitor definition " +
        '(see https://docs.opensearch.org/latest/observing-your-data/alerting/api/#create-a-query-level-monitor). ' +
        'For query_level_monitor/bucket_level_monitor: [{ "search": { "indices": ["my-index"], "query": { "size": 0, "query": {...}, "aggregations": {...} } } }]. ' +
        'For doc_level_monitor: [{ "doc_level_input": { "indices": ["my-index"], "queries": [{ "id": "...", "name": "...", "query": "field:value", "tags": [...] }] } }].'
    )
);

const MonitorTriggersSchema = lazySchema(() =>
  z
    .array(boundedRecord(30))
    .max(10)
    .describe(
      "The monitor's trigger(s), following the OpenSearch monitor definition. " +
        'For query_level_monitor: [{ "name": "...", "severity": "1", "condition": { "script": { "source": "ctx.results[0].hits.total.value > 0", "lang": "painless" } }, "actions": [...] }]. ' +
        'For bucket_level_monitor, wrap the same shape under a "bucket_level_trigger" key; for doc_level_monitor, under a "document_level_trigger" key. ' +
        'The "actions" array (notification destinations) may be left empty ([]) if no notification is needed.'
    )
);

const RbacRolesSchema = lazySchema(() =>
  z
    .array(z.string().min(1).max(100))
    .max(20)
    .optional()
    .describe(
      'Optional backend role names to limit access to this monitor (fine-grained security / rbac_roles). Only relevant for self-managed clusters with the Security plugin.'
    )
);

// ============================================================================
// Alerts
// ============================================================================

export const AcknowledgeAlertInputSchema = lazySchema(() =>
  z.object({
    monitorId: MonitorIdSchema,
    alertIds: AlertIdsSchema,
  })
);
export type AcknowledgeAlertInput = z.infer<typeof AcknowledgeAlertInputSchema>;

export const GetAlertsInputSchema = lazySchema(() =>
  z.object({
    monitorId: MonitorIdSchema.optional().describe(
      'Only return alerts for this monitor ID. Omit to return alerts across all monitors.'
    ),
    alertState: AlertStateSchema.optional(),
    severityLevel: z
      .string()
      .max(50)
      .optional()
      .describe(
        'Filter by severity level, e.g. "1" (highest) through "5" (lowest). Defaults to "ALL".'
      ),
    searchString: z
      .string()
      .max(500)
      .optional()
      .describe(
        'Free-text filter applied to alert attributes, e.g. a monitor or trigger name fragment.'
      ),
    sortString: z
      .string()
      .max(200)
      .optional()
      .describe('The field to sort by. Defaults to "monitor_name.keyword".'),
    sortOrder: SortOrderSchema.optional(),
    size: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Maximum number of alerts to return. Defaults to 20.'),
    startIndex: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Pagination offset into the result set. Defaults to 0.'),
  })
);
export type GetAlertsInput = z.infer<typeof GetAlertsInputSchema>;

// ============================================================================
// Monitors
// ============================================================================

export const MonitorIdInputSchema = lazySchema(() =>
  z.object({
    monitorId: MonitorIdSchema,
  })
);
export type MonitorIdInput = z.infer<typeof MonitorIdInputSchema>;

export const ExecuteMonitorInputSchema = lazySchema(() =>
  z.object({
    monitorId: MonitorIdSchema,
    dryrun: z
      .boolean()
      .optional()
      .describe(
        'When true, evaluate the monitor and return trigger results without sending any notification actions. Defaults to false.'
      ),
  })
);
export type ExecuteMonitorInput = z.infer<typeof ExecuteMonitorInputSchema>;

export const SearchMonitorsInputSchema = lazySchema(() =>
  z.object({
    name: z.string().max(200).optional().describe('Match monitors whose name contains this text.'),
    index: z
      .string()
      .max(200)
      .optional()
      .describe('Match monitors that read from this index or index pattern.'),
    enabled: z
      .boolean()
      .optional()
      .describe(
        'Filter to only enabled (true) or only disabled (false) monitors. Omit to return both.'
      ),
    size: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Maximum number of monitors to return. Defaults to 20.'),
    from: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Pagination offset into the result set. Defaults to 0.'),
  })
);
export type SearchMonitorsInput = z.infer<typeof SearchMonitorsInputSchema>;

export const CreateMonitorInputSchema = lazySchema(() =>
  z.object({
    name: z.string().min(1).max(200).describe('A human-readable name for the monitor.'),
    monitorType: MonitorTypeSchema,
    enabled: z
      .boolean()
      .optional()
      .describe('Whether the monitor is active on creation. Defaults to true.'),
    schedule: ScheduleSchema,
    inputs: MonitorInputsSchema,
    triggers: MonitorTriggersSchema,
    rbacRoles: RbacRolesSchema,
  })
);
export type CreateMonitorInput = z.infer<typeof CreateMonitorInputSchema>;

export const UpdateMonitorInputSchema = lazySchema(() =>
  z
    .object({
      monitorId: MonitorIdSchema,
      name: z
        .string()
        .min(1)
        .max(200)
        .optional()
        .describe('A new human-readable name for the monitor.'),
      monitorType: MonitorTypeSchema.optional(),
      enabled: z.boolean().optional().describe('Whether the monitor should be active.'),
      schedule: ScheduleSchema.optional(),
      inputs: MonitorInputsSchema.optional(),
      triggers: MonitorTriggersSchema.optional(),
      rbacRoles: RbacRolesSchema,
    })
    .refine(
      (value) =>
        value.name !== undefined ||
        value.monitorType !== undefined ||
        value.enabled !== undefined ||
        value.schedule !== undefined ||
        value.inputs !== undefined ||
        value.triggers !== undefined ||
        value.rbacRoles !== undefined,
      { message: 'Specify at least one field to update.' }
    )
);
export type UpdateMonitorInput = z.infer<typeof UpdateMonitorInputSchema>;

// ============================================================================
// Security Analytics detectors, detector alerts, and findings
// ============================================================================

const DetectorTypeSchema = z
  .enum(['linux', 'network', 'windows', 'ad_ldap', 'apache_access', 'cloudtrail', 'dns', 's3'])
  .describe("The detector's log type.");

export const SearchDetectorsInputSchema = lazySchema(() =>
  z.object({
    name: z.string().max(200).optional().describe('Match detectors whose name contains this text.'),
    detectorType: DetectorTypeSchema.optional().describe(
      'Filter to detectors of this log type. Omit to return detectors of any type.'
    ),
    size: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Maximum number of detectors to return. Defaults to 20.'),
  })
);
export type SearchDetectorsInput = z.infer<typeof SearchDetectorsInputSchema>;

export const AcknowledgeDetectorAlertInputSchema = lazySchema(() =>
  z.object({
    detectorId: DetectorIdSchema,
    alertIds: AlertIdsSchema,
  })
);
export type AcknowledgeDetectorAlertInput = z.infer<typeof AcknowledgeDetectorAlertInputSchema>;

export const GetDetectorFindingsInputSchema = lazySchema(() =>
  z.object({
    detectorId: DetectorIdSchema.optional().describe(
      'Only return findings for this detector ID. Use searchDetectors to find it. Either detectorId or detectorType is required.'
    ),
    detectorType: DetectorTypeSchema.optional().describe(
      'Only return findings for detectors of this log type. Either detectorId or detectorType is required.'
    ),
    detectionType: z
      .enum(['rule', 'threat'])
      .optional()
      .describe(
        '"rule" returns findings generated by the detector\'s Sigma rules; "threat" returns findings generated by threat-intelligence feed matches.'
      ),
    severity: z
      .enum(['critical', 'high', 'medium', 'low'])
      .optional()
      .describe('Filter findings by the severity of the detection rule that generated them.'),
    sortOrder: SortOrderSchema.optional(),
    size: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe('Maximum number of findings to return.'),
    startIndex: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Pagination offset into the result set. Defaults to 0.'),
  })
);
export type GetDetectorFindingsInput = z.infer<typeof GetDetectorFindingsInputSchema>;

// ============================================================================
// Document search / index
// ============================================================================

export const ListIndicesInputSchema = lazySchema(() =>
  z.object({
    pattern: z
      .string()
      .max(255)
      .optional()
      .describe(
        'Only list indices matching this name or pattern, e.g. "logs-*". Omit to list all indices.'
      ),
  })
);
export type ListIndicesInput = z.infer<typeof ListIndicesInputSchema>;

export const RunQueryInputSchema = lazySchema(() =>
  z.object({
    index: z
      .string()
      .min(1)
      .max(255)
      .describe('The index or index pattern to search, e.g. "logs-*" or "my-index".'),
    query: boundedRecord(30).describe(
      'The OpenSearch Query DSL search request body, e.g. { "query": { "match": { "message": "error" } }, "size": 20, "sort": [...] }. Passed through as-is to the _search API.'
    ),
  })
);
export type RunQueryInput = z.infer<typeof RunQueryInputSchema>;

export const IndexDocumentInputSchema = lazySchema(() =>
  z.object({
    index: z.string().min(1).max(255).describe('The index to write the document into.'),
    document: boundedRecord(50).describe('The JSON document body to index.'),
    id: z
      .string()
      .max(512)
      .optional()
      .describe(
        'An explicit document ID. If provided and a document with this ID already exists, it is fully replaced. If omitted, OpenSearch generates an ID automatically.'
      ),
  })
);
export type IndexDocumentInput = z.infer<typeof IndexDocumentInputSchema>;
