/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

export interface CapabilityManifest {
  supportedSignals: Array<'traces' | 'logs' | 'metrics' | 'synthetics' | 'hosts'>;
  supportedEntities: Array<'services' | 'instances' | 'agents' | 'hosts' | string>;
  enums: {
    agentNames?: string[];
    spanTypes?: string[];
    spanSubtypes?: string[];
  };
  correlationKeys: string[];
}

export function buildDslSchema(manifest: CapabilityManifest) {
  const intervalSchema = z.string().describe('Datemath or duration like 1m, 30s');
  const rateSchema = z.number().int().positive().describe('Events per interval');

  const timelineAnchor = z
    .string()
    .regex(/^([0-9]{1,2}|100)%$/, 'Must be a percentage, e.g. 70%')
    .describe('Percent into the time window');

  const distributionSchema: z.ZodTypeAny = z.discriminatedUnion('type', [
    z.object({ type: z.literal('constant'), value: z.number() }),
    z.object({ type: z.literal('normal'), mean: z.number(), sd: z.number() }),
    z.object({ type: z.literal('uniform'), min: z.number(), max: z.number() }),
    z.object({ type: z.literal('linear'), from: z.number(), to: z.number() }),
    z.object({
      type: z.literal('piecewise'),
      segments: z
        .array(
          z.object({
            from: timelineAnchor.optional(),
            to: timelineAnchor.optional(),
            value: z.union([z.number(), z.lazy(() => distributionSchema)]),
          })
        )
        .min(1),
    }),
  ]);

  const spanSchema = z.object({
    name: z.string(),
    type: z.string().describe('Span type').optional(),
    subtype: z.string().describe('Span subtype').optional(),
    durationMs: z.number().positive().optional(),
  });

  const traceBlock = z.object({
    id: z.string().optional(),
    name: z.string(),
    interval: intervalSchema.optional(),
    rate: rateSchema.optional(),
    count: z.number().int().positive().optional(),
    errorRate: z
      .union([z.number().min(0).max(1), distributionSchema])
      .optional()
      .describe(
        'Error rate as a number (0-1) or a distribution with piecewise segments for time-varying error rates'
      ),
    spans: z.array(spanSchema).optional(),
  });

  const logsBlock = z.object({
    interval: intervalSchema.optional(),
    rate: rateSchema.optional(),
    level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
    message: z.string().optional(),
    dataset: z
      .union([z.string(), z.array(z.string()).min(1)])
      .optional()
      .describe(
        'Dataset name(s). If array, datasets will be rotated. If not provided, uses random dataset.'
      ),
    namespace: z
      .union([z.string(), z.array(z.string()).min(1)])
      .optional()
      .describe('Namespace(s) for data stream. If array, namespaces will be rotated.'),
    hostName: z
      .union([z.string(), z.array(z.string()).min(1)])
      .optional()
      .describe('Host name(s). If array, host names will be rotated.'),
    containerId: z
      .union([z.string(), z.array(z.string()).min(1)])
      .optional()
      .describe('Container ID(s). If array, container IDs will be rotated.'),
    customFields: z
      .union([
        z
          .record(z.string(), z.unknown())
          .describe('Simple custom fields: { "fieldName": "value" }'),
        z
          .object({
            count: z
              .number()
              .int()
              .positive()
              .describe('Number of fields to generate (for bulk generation)'),
            prefix: z
              .string()
              .optional()
              .describe(
                'Prefix for field names (e.g., "field" generates "field-0", "field-1", etc.)'
              ),
            valueType: z
              .enum(['fixed', 'random', 'rotated', 'dynamic', 'sequential'])
              .optional()
              .describe(
                'Value generation type: fixed (use value), random (random value), rotated (rotate through values), dynamic (computed), sequential (0, 1, 2, ...)'
              ),
            value: z
              .union([
                z.string(),
                z.number(),
                z.boolean(),
                z.array(z.union([z.string(), z.number(), z.boolean()])).min(1),
              ])
              .optional()
              .describe(
                'Value(s) for the field. For "rotated" type, provide array. For "fixed" type, provide single value. For "random", specify valueType only.'
              ),
            valueConfig: z
              .object({
                min: z.number().optional().describe('Minimum value for random numbers'),
                max: z.number().optional().describe('Maximum value for random numbers'),
                stringLength: z
                  .number()
                  .int()
                  .positive()
                  .optional()
                  .describe('Length for random strings'),
                numericOnly: z
                  .boolean()
                  .optional()
                  .describe('If true, generate numeric values only (for random type)'),
                alternating: z
                  .boolean()
                  .optional()
                  .describe(
                    'If true, alternate between numeric and string values (for random type)'
                  ),
                valueTypeSpecific: z
                  .enum(['int', 'bool', 'double', 'string'])
                  .optional()
                  .describe(
                    'Generate type-specific values: int (integer), bool (boolean), double (float), string'
                  ),
                asString: z
                  .boolean()
                  .optional()
                  .describe(
                    'If true, generate string representation of the value (e.g., "6" instead of 6, "true" instead of true)'
                  ),
              })
              .optional()
              .describe('Configuration for value generation'),
            fields: z
              .array(
                z.object({
                  name: z.string().describe('Field name'),
                  valueType: z
                    .enum(['fixed', 'random', 'rotated', 'dynamic', 'sequential'])
                    .optional()
                    .describe('Value generation type for this specific field'),
                  valueTypeSpecific: z
                    .enum(['int', 'bool', 'double', 'string'])
                    .optional()
                    .describe('Type-specific value generation'),
                  asString: z.boolean().optional().describe('Generate as string representation'),
                  value: z
                    .union([
                      z.string(),
                      z.number(),
                      z.boolean(),
                      z.array(z.union([z.string(), z.number(), z.boolean()])).min(1),
                    ])
                    .optional()
                    .describe('Value(s) for this field'),
                  valueConfig: z
                    .object({
                      min: z.number().optional(),
                      max: z.number().optional(),
                    })
                    .optional()
                    .describe('Value configuration for this field'),
                })
              )
              .optional()
              .describe(
                'Explicit field definitions. If provided, overrides count/prefix-based generation. Useful for creating pairs or groups of related fields.'
              ),
            fieldNames: z
              .array(z.string())
              .min(1)
              .optional()
              .describe(
                'Rotated field names (if provided, these will be used instead of prefix-based names)'
              ),
            namespace: z
              .string()
              .optional()
              .describe(
                'Namespace prefix (default: "log.custom"). Use empty string "" for no prefix, or specify custom namespace like "custom"'
              ),
            degradeForFailed: z
              .boolean()
              .optional()
              .describe(
                'If true and document is failed, generate fields with values exceeding 1024 characters to cause mapping conflicts'
              ),
          })
          .describe('Advanced custom field generation configuration'),
      ])
      .optional()
      .describe(
        'Custom fields under log.custom.* namespace. Can be simple object or advanced generation config.'
      ),
    cloud: z
      .object({
        provider: z.string().optional(),
        region: z.string().optional(),
        availabilityZone: z.string().optional(),
        projectId: z.string().optional(),
        instanceId: z.string().optional(),
      })
      .optional()
      .describe('Cloud provider fields'),
    orchestrator: z
      .object({
        clusterName: z.string().optional(),
        clusterId: z.string().optional(),
        namespace: z.string().optional(),
        resourceId: z.string().optional(),
      })
      .optional()
      .describe('Orchestrator fields (e.g., Kubernetes)'),
    traceId: z.string().optional().describe('Trace ID for correlation'),
    transactionId: z.string().optional().describe('Transaction ID for correlation'),
    agentId: z.string().optional().describe('Agent ID'),
    agentName: z.string().optional().describe('Agent name'),
    logFilePath: z.string().optional().describe('Log file path'),
    degradedRate: z
      .union([z.number().min(0).max(1), distributionSchema])
      .optional()
      .describe(
        'Degraded/Ignored rate as a number (0-1) or a distribution. Degraded documents are indexed but have non-empty _ignore property due to fields exceeding ignore_above limits (e.g., 1024 characters).'
      ),
    ignoredRate: z
      .union([z.number().min(0).max(1), distributionSchema])
      .optional()
      .describe(
        'Ignored rate (alias for degradedRate). Documents are indexed but have non-empty _ignore property due to mapping conflicts.'
      ),
    failureRate: z
      .union([z.number().min(0).max(1), distributionSchema])
      .optional()
      .describe(
        'Failure rate as a number (0-1) or a distribution. Failed documents fail ingestion entirely and go to failure store (not indexed in normal indexes). Requires missing required fields or invalid values that trigger fail processors.'
      ),
  });

  const metricsBlock = z.object({
    interval: intervalSchema.optional(),
    rate: rateSchema.optional(),
    metrics: z.record(z.string(), z.union([z.number(), distributionSchema])).optional(),
  });

  const syntheticsBlock = z.object({
    interval: intervalSchema.optional(),
    rate: rateSchema.optional(),
    type: z.enum(['http', 'browser']).optional(),
    name: z.string().optional(),
    monitorId: z.string(), // Required: unique monitor identifier
    origin: z.string(), // Required: location where monitor runs from (e.g., "us-east-1", "eu-west-1")
  });

  const hostsBlock = z.object({
    interval: intervalSchema.optional(),
    rate: rateSchema.optional(),
    metrics: z
      .array(z.enum(['cpu', 'memory', 'network', 'load', 'filesystem', 'diskio']))
      .optional(),
  });

  const signalBlocks: Record<string, z.ZodTypeAny> = {};
  if (manifest.supportedSignals.includes('traces'))
    signalBlocks.traces = z.array(traceBlock).optional();
  if (manifest.supportedSignals.includes('logs')) signalBlocks.logs = z.array(logsBlock).optional();
  if (manifest.supportedSignals.includes('metrics'))
    signalBlocks.metrics = z.array(metricsBlock).optional();
  if (manifest.supportedSignals.includes('synthetics'))
    signalBlocks.synthetics = z.array(syntheticsBlock).optional();
  if (manifest.supportedSignals.includes('hosts'))
    signalBlocks.hosts = z.array(hostsBlock).optional();

  const instanceSchema = z.object({
    id: z.string(),
    host: z.string().optional(),
    ...signalBlocks,
  });

  const serviceSchema = z.object({
    id: z.string(),
    name: z.string(),
    environment: z.string().optional(),
    agentName: z.string().optional(),
    instances: z.array(instanceSchema).min(1),
  });

  const rootSchema = z
    .object({
      timeWindow: z.object({ from: z.string(), to: z.string() }),
      seed: z.number().int().optional(),
      services: z.array(serviceSchema).optional(),
    })
    .strict()
    .refine(
      (data) => {
        // At least one service must be provided to generate data
        return data.services !== undefined && data.services.length > 0;
      },
      {
        message:
          'At least one service must be provided. The schema requires a "services" array with service configurations containing instances, traces, logs, metrics, etc.',
        path: ['services'],
      }
    );

  return rootSchema;
}
