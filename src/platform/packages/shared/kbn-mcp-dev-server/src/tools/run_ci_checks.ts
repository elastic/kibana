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
    ]),
  parallel: z.boolean().optional().default(true),
  cleanCache: z.boolean().optional().default(false),
});

interface CheckResult {
  check: string;
  status: 'passed' | 'failed';
  output?: string;
  error?: string;
}

async function runCheck(check: string, cleanCache: boolean = false): Promise<CheckResult> {
  try {
    let command: string;
    let args: string[] = [];

    switch (check) {
      case 'build':
        command = 'node';
        args = ['scripts/build', '--with-test-plugins', '--with-example-plugins'];
        break;
      case 'quick_checks':
        command = 'node';
        args = [
          'scripts/quick_checks',
          '--file',
          '.buildkite/scripts/steps/checks/quick_checks.txt',
        ];
        break;
      case 'checks':
        // Run the main checks that are part of the CI pipeline
        command = 'bash';
        args = ['.buildkite/scripts/steps/checks.sh'];
        break;
      case 'type_check':
        command = 'node';
        args = cleanCache ? ['scripts/type_check', '--clean-cache'] : ['scripts/type_check'];
        break;
      case 'linting_with_types':
        command = 'node';
        args = ['scripts/eslint_with_types'];
        break;
      case 'linting':
        // Run both eslint and stylelint
        command = 'bash';
        args = ['.buildkite/scripts/steps/lint.sh'];
        break;
      case 'oas_snapshot':
        command = 'bash';
        args = ['.buildkite/scripts/steps/checks/capture_oas_snapshot.sh'];
        break;
      default:
        throw new Error(`Unknown check: ${check}`);
    }

    const startTime = Date.now();
    const { stdout, stderr } = await execa(command, args, {
      cwd: REPO_ROOT,
      stdio: 'pipe',
      timeout: check === 'type_check' ? 1200000 : 300000, // 20 minutes for type_check, 5 minutes for others
    });
    const duration = Date.now() - startTime;

    // Check if type_check was suspiciously fast (likely using cache)
    if (check === 'type_check' && duration < 5000) {
      // Less than 5 seconds
      const warning = `⚠️  WARNING: TypeScript check completed in ${duration}ms, which seems too fast. This might be using cached results. Consider running with --clean-cache for a full type check.`;
      return {
        check,
        status: 'passed',
        output: `${warning}\n\n${stdout}\n${stderr}`.trim(),
      };
    }

    return {
      check,
      status: 'passed',
      output: `${stdout}\n${stderr}`.trim(),
    };
  } catch (error: any) {
    return {
      check,
      status: 'failed',
      output: error.stdout || '',
      error: error.stderr || error.message,
    };
  }
}

async function runCiChecks(input: z.infer<typeof runCiChecksInputSchema>) {
  const { checks, parallel, cleanCache } = input;
  const results: CheckResult[] = [];

  if (parallel) {
    // Run checks in parallel
    const promises = checks.map((check) => runCheck(check, cleanCache));
    const parallelResults = await Promise.all(promises);
    results.push(...parallelResults);
  } else {
    // Run checks sequentially
    for (const check of checks) {
      const result = await runCheck(check, cleanCache);
      results.push(result);

      // If a check fails and we're running sequentially, we might want to stop
      // or continue depending on the use case
      if (result.status === 'failed') {
        // Continue with remaining checks
      }
    }
  }

  const success = results.every((r) => r.status === 'passed');
  const summary = {
    success,
    total: results.length,
    passed: results.filter((r) => r.status === 'passed').length,
    failed: results.filter((r) => r.status === 'failed').length,
    results,
  };

  return summary;
}

export const runCiChecksTool: ToolDefinition<typeof runCiChecksInputSchema> = {
  name: 'run_ci_checks',
  description:
    'Run CI checks similar to the BuildKite pipeline including build, quick checks, linting, type checking, and OAS snapshot validation',
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
