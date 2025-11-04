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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    loadManifest: require(path.join(synthtracePath, 'generator')).loadManifest,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    generateSchema: require(path.join(synthtracePath, 'generator')).generateSchema,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    validateConfigWithManifest: require(path.join(synthtracePath, 'validation'))
      .validateConfigWithManifest,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
      'Action-specific payload (object or JSON string - strings will be parsed automatically). For validate/apply actions, pass config object directly in payload.config - DO NOT create files.'
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
              schemaStructure: {
                description:
                  'The schema MUST follow this structure. Top-level fields are: timeWindow (required), seed (optional), services (required array).',
                topLevelFields: {
                  timeWindow: {
                    type: 'object',
                    required: true,
                    description: 'Time range for data generation',
                    example: { from: 'now-1h', to: 'now' },
                  },
                  seed: {
                    type: 'number',
                    required: false,
                    description: 'Random seed for reproducible data',
                  },
                  services: {
                    type: 'array',
                    required: true,
                    description:
                      'Array of service configurations. Each service contains instances, and each instance contains traces, logs, metrics, etc.',
                    example: [
                      {
                        id: 'service-1',
                        name: 'service-1',
                        agentName: 'nodejs',
                        environment: 'production',
                        instances: [
                          {
                            id: 'instance-1',
                            logs: [{ message: 'Log message', level: 'info', rate: 10 }],
                          },
                        ],
                      },
                    ],
                  },
                },
                commonMistakes: [
                  'Do NOT use fields like "scenario", "dataSource", "indexPattern", "interval", "count", "logConfig", "failureStore" at the top level',
                  'Do NOT use a flat structure - use the nested services -> instances -> logs/traces/metrics structure',
                  'Logs go inside instances.logs array, not at the top level',
                  'Failure rate is specified per log block using "failureRate" field, not a separate "failureStore" object',
                ],
                failureVsDegraded: {
                  description:
                    'CRITICAL: Understand the difference between failed and degraded documents',
                  failedDocs: {
                    field: 'failureRate',
                    description:
                      'Failed documents FAIL ingestion entirely and go to failure store (NOT indexed in normal indexes)',
                    promptKeywords: ['failed docs', 'failed documents', 'failure', 'failures'],
                    example: 'Prompt: "50% failed docs" → config: { "failureRate": 0.5 }',
                    behavior:
                      'Documents with missing required fields (e.g., log.level is undefined) that trigger fail processors',
                  },
                  degradedDocs: {
                    field: 'degradedRate',
                    aliases: ['ignoredRate'],
                    description:
                      'Degraded documents ARE indexed but have non-empty _ignore property due to fields exceeding ignore_above limits',
                    promptKeywords: [
                      'degraded docs',
                      'degraded documents',
                      'degraded',
                      'ignored docs',
                      'ignored documents',
                    ],
                    example: 'Prompt: "50% degraded docs" → config: { "degradedRate": 0.5 }',
                    behavior:
                      'Documents with fields exceeding 1024 character limit (e.g., log.level with MORE_THAN_1024_CHARS)',
                  },
                  bothTogether: {
                    description:
                      'You can specify BOTH failureRate and degradedRate in the same log config. They are MUTUALLY EXCLUSIVE.',
                    example:
                      'Prompt: "50% failed docs and 25% degraded docs" → config: { "failureRate": 0.5, "degradedRate": 0.25 }',
                    note: 'Failed documents take precedence. degradedRate represents percentage of ALL documents (non-overlapping with failed). Example: failureRate=0.5, degradedRate=0.25 → 50% failed, 25% degraded, 25% normal.',
                  },
                },
              },
              nextSteps: [
                'Call get_schema to see the COMPLETE JSON Schema with all fields',
                'Call get_examples to see example configurations that follow the correct structure',
                'Generate a config object based on the prompt (IN MEMORY ONLY - do not create files)',
                'Ensure the config follows: { timeWindow: {...}, services: [{ id, name, instances: [{ id, logs: [...] }] }] }',
                'Call validate with the generated config (pass config object in payload.config)',
                'Call apply to execute the config (pass config object in payload.config)',
              ],
              criticalInstructions: [
                'DO NOT create any files (.json, .js, .ts, etc.)',
                'DO NOT modify or write any code',
                'DO NOT use file system operations',
                'Pass configuration objects directly in tool payload.config parameter',
                'The apply action executes immediately and indexes data - no files needed',
                'All operations must be done through tool calls only',
                'ALWAYS use get_schema first to understand the exact structure',
              ],
              promptParsingGuide: {
                description:
                  'When parsing prompts, pay special attention to failed vs degraded document specifications',
                examples: [
                  {
                    prompt:
                      'Ingest 100 documents to logs-foo.error-default with 50% of them as failed docs',
                    interpretation: {
                      dataset: 'logs-foo.error-default',
                      totalDocs: 100,
                      failureRate: 0.5,
                      degradedRate: undefined,
                    },
                    configSnippet: {
                      logs: [
                        {
                          message: 'Log message',
                          level: 'error',
                          rate: 100,
                          dataset: 'foo.error',
                          failureRate: 0.5,
                        },
                      ],
                    },
                  },
                  {
                    prompt: 'Ingest docs with 50% degraded and 25% failed docs',
                    interpretation: {
                      degradedRate: 0.5,
                      failureRate: 0.25,
                    },
                    configSnippet: {
                      logs: [
                        {
                          message: 'Log message',
                          level: 'info',
                          rate: 10,
                          degradedRate: 0.5,
                          failureRate: 0.25,
                        },
                      ],
                    },
                  },
                ],
                keyRules: [
                  'Keywords "failed docs", "failed documents", "failure", "failures" → use "failureRate" field',
                  'Keywords "degraded docs", "degraded documents", "degraded", "ignored docs" → use "degradedRate" field',
                  'Convert percentages to decimals (50% → 0.5, 25% → 0.25)',
                  'Both failureRate and degradedRate can be specified together in the same log config (mutually exclusive)',
                  'When total document count is specified (e.g., "100 documents"), set rate to that number',
                  'Note: indexedIndices may return patterns like "logs-*-*" - this is expected behavior (data stream patterns)',
                ],
              },
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
        // Check if the config has unrecognized top-level fields
        const config = payload.config as Record<string, unknown>;
        const knownFields = ['timeWindow', 'seed', 'services'];
        const unknownFields = Object.keys(config).filter((key) => !knownFields.includes(key));

        let errorMessage = `Validation failed: ${result.errors
          .map((e: { path: string; message: string }) => `${e.path}: ${e.message}`)
          .join(', ')}`;

        if (unknownFields.length > 0) {
          errorMessage += `\n\nUnrecognized fields found: ${unknownFields.join(', ')}. `;
          errorMessage += 'The schema only supports: timeWindow, seed, and services. ';
          errorMessage += 'Please use the "get_schema" action to see the correct format. ';
          errorMessage +=
            'The schema structure is: { timeWindow: {...}, services: [{ id, name, instances: [{ id, traces: [...], logs: [...] }] }] }';
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  valid: false,
                  errors: result.errors,
                  unknownFields: unknownFields.length > 0 ? unknownFields : undefined,
                  message: errorMessage,
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
        // Check if the config has unrecognized top-level fields
        const config = payload.config as Record<string, unknown>;
        const knownFields = ['timeWindow', 'seed', 'services'];
        const unknownFields = Object.keys(config).filter((key) => !knownFields.includes(key));

        let errorMessage = `Validation failed: ${validation.errors
          .map((e: { path: string; message: string }) => `${e.path}: ${e.message}`)
          .join(', ')}`;

        if (unknownFields.length > 0) {
          errorMessage += `\n\nUnrecognized fields found: ${unknownFields.join(', ')}. `;
          errorMessage += 'The schema only supports: timeWindow, seed, and services. ';
          errorMessage += 'Please use the "get_schema" action to see the correct format. ';
          errorMessage +=
            'The schema structure is: { timeWindow: {...}, services: [{ id, name, instances: [{ id, traces: [...], logs: [...] }] }] }';
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  error: 'Validation failed',
                  errors: validation.errors,
                  unknownFields: unknownFields.length > 0 ? unknownFields : undefined,
                  message: errorMessage,
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
        const result = await synthtrace.executeSchema(validation.value, executeArgv);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: true,
                message: 'Schema executed successfully. Data has been indexed.',
                target: executeArgv.target,
                indexedIndices: result.indexedIndices || [],
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

      // Determine affected indices based on config
      const affectedIndices: string[] = [];
      if (config.services) {
        let hasTraces = false;
        let hasLogs = false;
        for (const service of config.services) {
          for (const instance of service.instances) {
            if (instance.traces || instance.metrics) {
              hasTraces = true;
            }
            if (instance.logs) {
              hasLogs = true;
            }
          }
        }
        if (hasTraces || hasLogs) {
          affectedIndices.push('traces-apm*', 'metrics-apm*');
        }
        if (hasLogs) {
          affectedIndices.push('logs-*-*');
        }
      }

      reportLines.push('AFFECTED INDICES');
      reportLines.push('-'.repeat(80));
      if (affectedIndices.length > 0) {
        affectedIndices.forEach((index) => {
          reportLines.push(`  - ${index}`);
        });
      } else {
        reportLines.push('  (none - no data types configured)');
      }
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
- get_schema: Get the JSON Schema for synthtrace DSL (ALWAYS call this first to understand the structure)
- get_examples: Get example schema configurations
- generate: Generate a config from a natural language prompt (returns instructions)
- validate: Validate a config object against the schema
- apply: Execute a config directly - generates and indexes data to Elasticsearch (default: http://localhost:9200)
- estimate: Estimate event counts without executing
- dry_run: Dry run without executing
- report: Generate a tabular summary report of the configuration

SCHEMA STRUCTURE (MUST FOLLOW):
The config MUST have this structure:
{
  "timeWindow": { "from": "now-1h", "to": "now" },
  "services": [
    {
      "id": "service-1",
      "name": "service-1",
      "agentName": "nodejs",
      "environment": "production",
      "instances": [
        {
          "id": "instance-1",
          "logs": [{ "message": "...", "level": "info", "rate": 10, "failureRate": 0.5, "degradedRate": 0.3 }],
          "traces": [{ "name": "...", "rate": 10, "errorRate": 0.1 }],
          "metrics": [{ "metrics": { "cpu": { "type": "constant", "value": 0.5 } } }]
        }
      ]
    }
  ]
}

COMMON MISTAKES TO AVOID:
- Do NOT use top-level fields like "scenario", "dataSource", "indexPattern", "interval", "count", "logConfig", "failureStore"
- Do NOT use a flat structure - always use nested services -> instances -> logs/traces/metrics
- Logs go inside instances.logs array, not at the top level
- Failure rate is specified per log block using "failureRate" field (0-1), not a separate "failureStore" object

FAILED vs DEGRADED DOCUMENTS (CRITICAL DISTINCTION):
- FAILED DOCS: Use "failureRate" (0-1) - documents FAIL ingestion entirely and go to failure store (NOT indexed)
  * Prompt keywords: "failed docs", "failed documents", "failure", "failures"
  * Example: Prompt "50% failed docs" → config: { "failureRate": 0.5 }
  * Behavior: Documents with missing required fields (e.g., log.level undefined) that trigger fail processors
  
- DEGRADED DOCS: Use "degradedRate" or "ignoredRate" (0-1) - documents ARE indexed but have _ignore property
  * Prompt keywords: "degraded docs", "degraded documents", "degraded", "ignored docs", "ignored documents"
  * Example: Prompt "50% degraded docs" → config: { "degradedRate": 0.5 }
  * Behavior: Documents with fields exceeding 1024 character limit (e.g., log.level with MORE_THAN_1024_CHARS)

- BOTH TOGETHER: You can specify BOTH failureRate and degradedRate in the same log config
  * Example: Prompt "50% failed docs and 25% degraded docs" → config: { "failureRate": 0.5, "degradedRate": 0.25 }
  * Note: Failed and degraded documents are MUTUALLY EXCLUSIVE
  *   - Failed documents take precedence - if a document is marked as failed, it will NOT also be degraded
  *   - degradedRate represents the percentage of ALL documents that should be degraded (non-overlapping with failed)
  *   - Example: failureRate=0.5, degradedRate=0.25 results in: 50% failed, 25% degraded, 25% normal

CRITICAL INSTRUCTIONS:
- ALWAYS call get_schema first to see the complete JSON Schema
- DO NOT create any files (no .json, .js, .ts, or any other files)
- DO NOT modify or write any code
- DO NOT use file system operations (writeFile, createFile, etc.)
- Pass configuration objects directly in the tool's payload.config parameter
- The 'apply' action executes immediately - no intermediate files needed
- All operations are handled in-memory through tool calls only`,
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
