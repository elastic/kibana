/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';

import type { ToolDefinition } from '../types';

const runCiChecksInputSchema = z.object({
  checks: z
    .array(
      z.enum([
        'build',
        'quick_checks',
        'checks',
        'type_check',
        'linting_with_types',
        'linting',
        'oas_snapshot',
      ])
    )
    .optional()
    .default([
      'build',
      'quick_checks',
      'checks',
      'type_check',
      'linting_with_types',
      'linting',
      'oas_snapshot',
    ])
    .describe('Specific CI checks to run. Defaults to all checks.'),
  parallel: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to run checks in parallel. Defaults to true.'),
});

interface CheckResult {
  check: string;
  status: 'passed' | 'failed';
  error?: string;
  duration?: number;
}

interface CiChecksResult {
  success: boolean;
  results: CheckResult[];
  totalDuration: number;
}

const CI_CHECKS = {
  build: {
    name: 'Build Kibana Distribution',
    command: 'node --no-experimental-require-module scripts/build_kibana_platform_plugins',
    description: 'Build Kibana platform plugins',
  },
  quick_checks: {
    name: 'Quick Checks',
    command: 'yarn quick-checks',
    description: 'Run quick validation checks',
  },
  linting: {
    name: 'Linting',
    command: 'yarn lint',
    description: 'Run all linting checks (ESLint and Stylelint)',
  },
  type_check: {
    name: 'Type Check',
    command: 'yarn test:type_check',
    description: 'Run TypeScript type checking',
  },
  linting_with_types: {
    name: 'Linting (with types)',
    command: 'node --no-experimental-require-module scripts/eslint_with_types',
    description: 'Run ESLint with type checking',
  },
  oas_snapshot: {
    name: 'OAS Snapshot',
    command: 'node --no-experimental-require-module scripts/validate_oas_docs',
    description: 'Validate OpenAPI documentation',
  },
};

async function runSingleCheck(checkKey: string): Promise<CheckResult> {
  const check = CI_CHECKS[checkKey as keyof typeof CI_CHECKS];
  if (!check) {
    return {
      check: checkKey,
      status: 'failed',
      error: `Unknown check: ${checkKey}`,
    };
  }

  const startTime = Date.now();

  try {
    await execa.command(check.command, {
      cwd: REPO_ROOT,
      stdio: 'pipe',
      timeout: 900000, // 15 minutes timeout
    });

    const duration = Date.now() - startTime;
    return {
      check: checkKey,
      status: 'passed',
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      check: checkKey,
      status: 'failed',
      error: error.message || 'Unknown error',
      duration,
    };
  }
}

async function runCiChecks(input: z.infer<typeof runCiChecksInputSchema>): Promise<CiChecksResult> {
  const { checks, parallel } = input;
  const startTime = Date.now();

  // Filter to only run requested checks
  const checksToRun = checks.filter((check) => CI_CHECKS[check as keyof typeof CI_CHECKS]);

  if (checksToRun.length === 0) {
    return {
      success: false,
      results: [],
      totalDuration: 0,
    };
  }

  let results: CheckResult[];

  if (parallel) {
    // Run all checks in parallel
    const checkPromises = checksToRun.map((check) => runSingleCheck(check));
    const settledResults = await Promise.allSettled(checkPromises);
    results = settledResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // This shouldn't happen since runSingleCheck never rejects, but handle it just in case
        return {
          check: checksToRun[index],
          status: 'failed' as const,
          error: result.reason?.message || 'Unknown error',
          duration: 0,
        };
      }
    });
  } else {
    // Run checks sequentially
    results = [];
    for (const check of checksToRun) {
      const result = await runSingleCheck(check);
      results.push(result);

      // If a check fails and we're running sequentially, we could optionally stop here
      // For now, continue with all checks
    }
  }

  const totalDuration = Date.now() - startTime;
  const success = results.every((result) => result.status === 'passed');

  return {
    success,
    results,
    totalDuration,
  };
}

export const runCiChecksTool: ToolDefinition<typeof runCiChecksInputSchema> = {
  name: 'run_ci_checks',
  description:
    'Run CI checks similar to the Buildkite pipeline including build, quick checks, type checking, linting, and OAS snapshot validation',
  inputSchema: runCiChecksInputSchema,
  handler: async (input) => {
    const result = await runCiChecks(input);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};
