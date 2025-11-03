/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import fs from 'fs';
import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolDefinition } from '../types';

// Dynamic require to avoid circular dependencies
function getSynthtraceModule() {
  const synthtracePath = path.resolve(
    REPO_ROOT,
    'src/platform/packages/shared/kbn-apm-synthtrace/src/synth_schema'
  );

  return {
    loadManifest: require(path.join(synthtracePath, 'generator')).loadManifest,
    generateSchema: require(path.join(synthtracePath, 'generator')).generateSchema,
    validateConfigWithManifest: require(path.join(synthtracePath, 'validation'))
      .validateConfigWithManifest,
    executeSchema: require(path.join(synthtracePath, 'executor')).executeSchema,
  };
}

const payloadSchema = z
  .object({
    prompt: z.string().optional().describe('Natural language prompt for generating config'),
    config: z.any().optional().describe('Schema configuration object to validate/apply'),
    target: z
      .string()
      .optional()
      .describe('Elasticsearch target URL (default: http://localhost:9200)'),
    kibana: z.string().optional().describe('Kibana target URL'),
    apiKey: z.string().optional().describe('API key for authentication'),
    from: z.string().optional().describe('Override time window from'),
    to: z.string().optional().describe('Override time window to'),
    concurrency: z.number().optional().describe('Bulk indexing concurrency'),
    insecure: z.boolean().optional().describe('Skip SSL certificate validation'),
  })
  .optional();

const synthtraceInputSchema = z.object({
  action: z
    .enum([
      'get_schema',
      'get_examples',
      'generate',
      'validate',
      'apply',
      'estimate',
      'dry_run',
      'report',
    ])
    .describe('Action to perform'),
  payload: z
    .preprocess((val) => {
      // If payload is a string, try to parse it as JSON
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          // Return as-is if parsing fails, let Zod validate it
          return val;
        }
      }
      return val;
    }, payloadSchema)
    .optional()
    .describe(
      'Action-specific payload (object or JSON string - strings will be parsed automatically)'
    ),
});

async function handleSynthtraceAction(
  action: z.infer<typeof synthtraceInputSchema>['action'],
  payload?: z.infer<typeof synthtraceInputSchema>['payload']
) {
  const synthtrace = getSynthtraceModule();

  switch (action) {
    case 'get_schema': {
      // Ensure schema is generated
      try {
        synthtrace.generateSchema();
      } catch (err: unknown) {
        // Schema might already exist, continue
      }
      const schemaPath = path.resolve(
        REPO_ROOT,
        'src/platform/packages/shared/kbn-apm-synthtrace/src/synth_schema/schema.json'
      );
      if (!fs.existsSync(schemaPath)) {
        throw new Error('Schema not found. Run generate action first.');
      }
      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(schema, null, 2),
          },
        ],
      };
    }

    case 'get_examples': {
      const examplesDir = path.resolve(
        REPO_ROOT,
        'src/platform/packages/shared/kbn-apm-synthtrace/src/synth_schema/examples'
      );
      const examples: Record<string, any> = {};
      if (fs.existsSync(examplesDir)) {
        const files = fs.readdirSync(examplesDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(examplesDir, file);
            const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            examples[file] = content;
          }
        }
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(examples, null, 2),
          },
        ],
      };
    }

    case 'generate': {
      if (!payload?.prompt) {
        throw new Error('prompt is required for generate action');
      }
      // For now, return instructions - LLM should use get_schema and get_examples
      // In future, this could call an LLM directly or use a template
      const manifest = synthtrace.loadManifest();
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              message:
                'Use get_schema to get the JSON Schema, then use get_examples for reference. Generate a config object matching the schema based on the prompt.',
              prompt: payload.prompt,
              capabilities: manifest,
              nextSteps: [
                'Call get_schema to see the expected format',
                'Call get_examples to see example configurations',
                'Generate a config object based on the prompt',
                'Call validate with the generated config',
                'Call apply to execute the config',
              ],
            }),
          },
        ],
      };
    }

    case 'validate': {
      if (!payload?.config) {
        throw new Error('config is required for validate action');
      }
      const result = synthtrace.validateConfigWithManifest(payload.config);
      if (result.ok) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ valid: true, message: 'Configuration is valid' }),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  valid: false,
                  errors: result.errors,
                  message: `Validation failed: ${result.errors
                    .map((e: { path: string; message: string }) => `${e.path}: ${e.message}`)
                    .join(', ')}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }

    case 'apply':
    case 'estimate':
    case 'dry_run': {
      if (!payload?.config) {
        throw new Error('config is required for apply/estimate/dry_run action');
      }
      // Validate first
      const validation = synthtrace.validateConfigWithManifest(payload.config);
      if (!validation.ok) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  error: 'Validation failed',
                  errors: validation.errors,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      if (action === 'dry_run' || action === 'estimate') {
        // Estimate event counts without executing
        const config = validation.value;
        const { from, to } = getTimeRange(config);
        const durationMs = to - from;
        let estimatedEvents = 0;

        if (config.services) {
          for (const service of config.services) {
            for (const instance of service.instances) {
              if (instance.traces) {
                for (const trace of instance.traces) {
                  const count = trace.count || trace.rate || 10;
                  const intervalMs = 60000; // 1m default
                  const intervals = Math.max(1, Math.floor(durationMs / intervalMs));
                  estimatedEvents += count * intervals;
                  if (trace.spans) {
                    estimatedEvents += count * intervals * trace.spans.length;
                  }
                }
              }
              if (instance.metrics) {
                for (const metric of instance.metrics) {
                  const rate = metric.rate || 1;
                  const intervals = Math.max(1, Math.floor(durationMs / 30000)); // 30s default
                  estimatedEvents += rate * intervals;
                }
              }
              if (instance.logs) {
                for (const log of instance.logs) {
                  const rate = log.rate || 1;
                  const intervalMs = 60000; // 1m default
                  const intervals = Math.max(1, Math.floor(durationMs / intervalMs));
                  estimatedEvents += rate * intervals;
                }
              }
            }
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                action,
                estimatedEvents: estimatedEvents || 0,
                message:
                  action === 'dry_run'
                    ? 'Dry run completed'
                    : `Estimated ${estimatedEvents.toLocaleString()} events`,
              }),
            },
          ],
        };
      }

      // For apply, execute directly
      try {
        // Prepare argv for executeSchema
        const executeArgv: any = {
          target: payload.target || 'http://localhost:9200',
          kibana: payload.kibana,
          apiKey: payload.apiKey,
          from: payload.from,
          to: payload.to,
          concurrency: payload.concurrency || 1,
          insecure: payload.insecure || false,
          debug: false,
          verbose: false,
        };

        // Execute the schema directly
        await synthtrace.executeSchema(validation.value, executeArgv);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                message: 'Schema executed successfully. Data has been indexed.',
                target: executeArgv.target,
                config: {
                  services: validation.value.services?.length || 0,
                  timeWindow: validation.value.timeWindow,
                },
              }),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: error.message || String(error),
                stack: error.stack,
              }),
            },
          ],
          isError: true,
        };
      }
    }

    case 'report': {
      if (!payload?.config) {
        throw new Error('config is required for report action');
      }
      const validation = synthtrace.validateConfigWithManifest(payload.config);
      if (!validation.ok) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: 'Validation failed',
                errors: validation.errors,
              }),
            },
          ],
        };
      }

      const config = validation.value;
      const { from, to } = getTimeRange(config);
      const durationMs = to - from;
      const durationHours = durationMs / (1000 * 60 * 60);

      // Build summary
      const summary: {
        timeWindow: { from: string; to: string; duration: string };
        services: Array<{
          name: string;
          agent: string;
          environment: string;
          instances: number;
          traces: number;
          metrics: number;
          logs: number;
          totalTraces: number;
          totalSpans: number;
        }>;
        totals: {
          services: number;
          instances: number;
          traceConfigs: number;
          metricConfigs: number;
          logConfigs: number;
        };
      } = {
        timeWindow: {
          from: config.timeWindow.from,
          to: config.timeWindow.to,
          duration: `${durationHours.toFixed(2)} hours`,
        },
        services: [],
        totals: {
          services: 0,
          instances: 0,
          traceConfigs: 0,
          metricConfigs: 0,
          logConfigs: 0,
        },
      };

      if (config.services) {
        for (const service of config.services) {
          let traceConfigs = 0;
          let metricConfigs = 0;
          let logConfigs = 0;
          let totalTraces = 0;
          let totalSpans = 0;

          for (const instance of service.instances) {
            if (instance.traces) {
              traceConfigs += instance.traces.length;
              for (const trace of instance.traces) {
                const rate = trace.rate || trace.count || 10;
                const intervalMs = 60000; // 1m default
                const intervals = Math.floor(durationMs / intervalMs);
                totalTraces += rate * intervals;
                if (trace.spans) {
                  totalSpans += rate * intervals * trace.spans.length;
                }
              }
            }
            if (instance.metrics) {
              metricConfigs += instance.metrics.length;
            }
            if (instance.logs) {
              logConfigs += instance.logs.length;
            }
          }

          summary.services.push({
            name: service.name,
            agent: service.agentName || 'unknown',
            environment: service.environment || 'unknown',
            instances: service.instances.length,
            traces: traceConfigs,
            metrics: metricConfigs,
            logs: logConfigs,
            totalTraces,
            totalSpans,
          });

          summary.totals.services += 1;
          summary.totals.instances += service.instances.length;
          summary.totals.traceConfigs += traceConfigs;
          summary.totals.metricConfigs += metricConfigs;
          summary.totals.logConfigs += logConfigs;
        }
      }

      // Generate tabular report
      const reportLines: string[] = [];
      reportLines.push('='.repeat(80));
      reportLines.push('SYNTHTRACE EXECUTION REPORT');
      reportLines.push('='.repeat(80));
      reportLines.push('');
      reportLines.push(
        `Time Window: ${summary.timeWindow.from} → ${summary.timeWindow.to} (${summary.timeWindow.duration})`
      );
      reportLines.push('');
      reportLines.push('SUMMARY');
      reportLines.push('-'.repeat(80));
      reportLines.push(`Total Services:     ${summary.totals.services}`);
      reportLines.push(`Total Instances:    ${summary.totals.instances}`);
      reportLines.push(`Trace Configs:     ${summary.totals.traceConfigs}`);
      reportLines.push(`Metric Configs:    ${summary.totals.metricConfigs}`);
      reportLines.push(`Log Configs:       ${summary.totals.logConfigs}`);
      reportLines.push('');
      reportLines.push('SERVICES BREAKDOWN');
      reportLines.push('-'.repeat(80));
      reportLines.push(
        'Service Name'.padEnd(25) +
          'Agent'.padEnd(12) +
          'Env'.padEnd(12) +
          'Instances'.padEnd(12) +
          'Traces'.padEnd(10) +
          'Metrics'.padEnd(10) +
          'Logs'.padEnd(10) +
          'Est. Events'
      );
      reportLines.push('-'.repeat(80));

      for (const svc of summary.services) {
        const estimatedEvents = svc.totalTraces + svc.totalSpans;
        reportLines.push(
          svc.name.padEnd(25) +
            svc.agent.padEnd(12) +
            svc.environment.padEnd(12) +
            String(svc.instances).padEnd(12) +
            String(svc.traces).padEnd(10) +
            String(svc.metrics).padEnd(10) +
            String(svc.logs).padEnd(10) +
            estimatedEvents.toLocaleString()
        );
      }

      reportLines.push('');
      reportLines.push('='.repeat(80));

      const reportText = reportLines.join('\n');

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                report: reportText,
                summary,
                formatted: true,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

function getTimeRange(config: any) {
  const now = Date.now();
  const fromStr = config.timeWindow?.from || 'now-1h';
  const toStr = config.timeWindow?.to || 'now';

  // Simple parsing for common patterns
  let from = now;
  let to = now;

  if (fromStr.startsWith('now-')) {
    const match = fromStr.match(/now-(\d+)([hms])/);
    if (match) {
      const [, num, unit] = match;
      const msMap: Record<string, number> = { h: 3600000, m: 60000, s: 1000 };
      from = now - parseInt(num, 10) * msMap[unit];
    }
  } else {
    try {
      from = new Date(fromStr).getTime();
    } catch {
      from = now - 3600000; // Default 1 hour
    }
  }

  if (toStr === 'now') {
    to = now;
  } else {
    try {
      to = new Date(toStr).getTime();
    } catch {
      to = now;
    }
  }

  return { from, to };
}

export const synthtraceTool: ToolDefinition<typeof synthtraceInputSchema> = {
  name: 'synthtrace',
  description: `Orchestrates synthtrace schema operations. Actions:
  - get_schema: Get the JSON Schema for synthtrace DSL
  - get_examples: Get example schema configurations
  - generate: Generate a config from a natural language prompt (returns instructions)
  - validate: Validate a config object against the schema
  - apply: Execute a config directly - generates and indexes data to Elasticsearch (default: http://localhost:9200)
  - estimate: Estimate event counts without executing
  - dry_run: Dry run without executing
  - report: Generate a tabular summary report of the configuration`,
  inputSchema: synthtraceInputSchema,
  handler: async (input) => {
    try {
      // Zod schema now handles string-to-object conversion automatically
      const result = await handleSynthtraceAction(input.action, input.payload);
      return result;
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: error.message || String(error),
              stack: error.stack,
            }),
          },
        ],
        isError: true,
      };
    }
  },
};
