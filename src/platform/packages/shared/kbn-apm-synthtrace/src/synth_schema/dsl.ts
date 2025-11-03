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
    failureRate: z
      .union([z.number().min(0).max(1), distributionSchema])
      .optional()
      .describe(
        'Failure rate as a number (0-1) or a distribution. Failed documents will have a field name exceeding 256 characters (keyword limit) to cause ingestion failures.'
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

  const rootSchema = z.object({
    timeWindow: z.object({ from: z.string(), to: z.string() }),
    seed: z.number().int().optional(),
    services: z.array(serviceSchema).optional(),
  });

  return rootSchema;
}
