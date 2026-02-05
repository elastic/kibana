/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readdir, readFile, stat } from 'fs/promises';
import { relative, resolve } from 'path';
import type { Logger } from '@kbn/core/server';
import { z } from '@kbn/zod';
import type { AgentBuilderPluginSetupContract } from '../../types';

export const GET_WORKFLOW_EXAMPLES_TOOL_ID = 'platform.workflows.get_examples';

// Tool type constant (matches ToolType.builtin from @kbn/agent-builder-common)
const TOOL_TYPE_BUILTIN = 'builtin';
// Result type constant (matches ToolResultType.other from @kbn/agent-builder-common)
const TOOL_RESULT_TYPE_OTHER = 'other';

// Path to the example workflows directory (relative to this file's location in dist)
// In the Kibana repo, examples are at: workflows/workflows/
const EXAMPLES_DIR = resolve(__dirname, '../../../../../../../../workflows/workflows');

interface WorkflowExample {
  path: string;
  yaml: string;
}

/**
 * Recursively get all YAML files in a directory
 */
async function getYamlFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = resolve(dir, entry.name);

      if (entry.isDirectory()) {
        // Recursively search subdirectories
        const subFiles = await getYamlFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
        files.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return files;
}

/**
 * Check if a path exists and is a directory
 */
async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Registers the get_workflow_examples tool with the Agent Builder.
 * This tool allows the LLM to search and retrieve example workflow YAML files
 * from the example library to learn correct syntax patterns.
 */
export function registerGetWorkflowExamplesTool(
  agentBuilder: AgentBuilderPluginSetupContract,
  logger: Logger
): void {
  agentBuilder.tools.register({
    id: GET_WORKFLOW_EXAMPLES_TOOL_ID,
    type: TOOL_TYPE_BUILTIN,
    description: `Search and retrieve example workflow YAML files from the library.
Use this tool to learn correct workflow syntax patterns before generating YAML.

**Available categories:**
- ai-agents: Agent invocation workflows
- data: Data ingestion and processing
- examples: Getting started demos
- integrations: Third-party integrations (slack, jira, jenkins, splunk, etc.)
- observability: Monitoring and alerting
- search: Elasticsearch queries and web search
- security/detection: Alert handling, threat checks
- security/enrichment: VirusTotal, IP reputation
- security/response: Case management, automated triaging
- utilities: Helper workflows

**Example queries:**
- category: "security" -> finds all security workflows
- searchTerm: "http" -> finds workflows using HTTP requests
- searchTerm: "foreach" -> finds workflows with iteration
- category: "integrations/slack" -> finds Slack integration examples`,
    tags: ['workflows', 'yaml', 'examples'],
    schema: z.object({
      category: z
        .string()
        .optional()
        .describe('Filter by category (e.g., "security", "integrations/slack", "examples")'),
      searchTerm: z
        .string()
        .optional()
        .describe('Search term to find in workflow names, descriptions, or content'),
      limit: z
        .number()
        .optional()
        .default(3)
        .describe('Maximum number of examples to return (default: 3, max: 5)'),
    }),
    handler: async ({ category, searchTerm, limit = 3 }) => {
      const effectiveLimit = Math.min(limit, 5); // Cap at 5 to avoid overwhelming the context

      try {
        // Determine the search directory based on category
        let searchDir = EXAMPLES_DIR;
        if (category) {
          const categoryPath = resolve(EXAMPLES_DIR, category);
          if (await isDirectory(categoryPath)) {
            searchDir = categoryPath;
          } else {
            return {
              results: [
                {
                  type: TOOL_RESULT_TYPE_OTHER,
                  data: {
                    error: `Category "${category}" not found`,
                    availableCategories: [
                      'ai-agents',
                      'data',
                      'examples',
                      'integrations',
                      'observability',
                      'search',
                      'security',
                      'utilities',
                    ],
                  },
                },
              ],
            };
          }
        }

        // Get all YAML files
        const files = await getYamlFiles(searchDir);

        if (files.length === 0) {
          return {
            results: [
              {
                type: TOOL_RESULT_TYPE_OTHER,
                data: {
                  message: 'No example workflows found',
                  searchDir: relative(EXAMPLES_DIR, searchDir) || '/',
                },
              },
            ],
          };
        }

        // Read file contents
        const examples: WorkflowExample[] = [];

        for (const filePath of files) {
          if (examples.length >= effectiveLimit * 2) break; // Read a few extra for filtering

          try {
            const content = await readFile(filePath, 'utf-8');
            const relativePath = relative(EXAMPLES_DIR, filePath);

            // Filter by search term if provided
            let shouldInclude = true;
            if (searchTerm) {
              const term = searchTerm.toLowerCase();
              if (
                !content.toLowerCase().includes(term) &&
                !relativePath.toLowerCase().includes(term)
              ) {
                shouldInclude = false;
              }
            }

            if (shouldInclude) {
              examples.push({
                path: relativePath,
                yaml: content,
              });
            }
          } catch (err) {
            logger.debug(`Failed to read workflow example: ${filePath}`);
          }
        }

        // Limit the results
        const limitedExamples = examples.slice(0, effectiveLimit);

        return {
          results: [
            {
              type: TOOL_RESULT_TYPE_OTHER,
              data: {
                count: limitedExamples.length,
                totalAvailable: files.length,
                searchCriteria: {
                  category: category || 'all',
                  searchTerm: searchTerm || null,
                },
                examples: limitedExamples,
              },
            },
          ],
        };
      } catch (err) {
        logger.error(`Error in get_workflow_examples tool: ${err}`);
        return {
          results: [
            {
              type: TOOL_RESULT_TYPE_OTHER,
              data: {
                error: 'Failed to retrieve workflow examples',
                details: err instanceof Error ? err.message : String(err),
              },
            },
          ],
        };
      }
    },
  });
}
