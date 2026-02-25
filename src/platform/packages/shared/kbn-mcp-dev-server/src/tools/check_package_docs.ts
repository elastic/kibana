/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import Path from 'path';

import { z } from '@kbn/zod';
import { REPO_ROOT } from '@kbn/repo-info';

import type { ToolDefinition } from '../types';
import { type FlatStats, generateStats, resolveTarget } from './docs_utils';

const checkPackageDocsInputSchema = z.object({
  target: z
    .string()
    .describe(
      'The plugin ID (e.g., "dashboard"), manifest ID (e.g., "@kbn/dashboard-plugin"), or file path to check.'
    ),
  type: z
    .enum(['plugin', 'package', 'file'])
    .optional()
    .describe(
      'How to interpret the target. If omitted, auto-detected: paths containing "/" are treated as files; otherwise tries plugin ID first, then manifest ID.'
    ),
});

const checkPackageDocs = async (input: z.infer<typeof checkPackageDocsInputSchema>) => {
  const resolved = resolveTarget(input.target, input.type);
  if ('error' in resolved) {
    return { error: resolved.error };
  }

  const { pkgInfo, filePath } = resolved;
  const { pkg, cliFlag, cliId } = pkgInfo;

  const genResult = await generateStats(cliFlag, cliId);
  if (!genResult.success) {
    return { error: `Failed to generate stats: ${genResult.error}` };
  }

  const statsPath = Path.resolve(pkg.directory, 'target', 'api_docs', 'stats.json');

  if (!fs.existsSync(statsPath)) {
    return {
      error: `Stats file not found at ${statsPath}. This may indicate an issue with the package.`,
    };
  }

  let stats: FlatStats;
  try {
    stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
  } catch {
    return { error: `Failed to parse stats file at ${statsPath}.` };
  }

  if (filePath) {
    const normalizedPath = filePath.startsWith('/') ? filePath : Path.resolve(REPO_ROOT, filePath);
    const relativePath = Path.relative(REPO_ROOT, normalizedPath);

    const filterByFile = <T extends { path: string }>(arr: T[]) =>
      arr.filter((item) => item.path === relativePath || item.path === filePath);

    const fileCounts = {
      missingComments: filterByFile(stats.missingComments).length,
      missingReturns: filterByFile(stats.missingReturns).length,
      paramDocMismatches: filterByFile(stats.paramDocMismatches).length,
      missingComplexTypeInfo: filterByFile(stats.missingComplexTypeInfo).length,
      isAnyType: filterByFile(stats.isAnyType).length,
    };

    const totalIssues = Object.values(fileCounts).reduce((sum, count) => sum + count, 0);
    const filePassed = totalIssues === 0;

    return {
      package: pkg.id,
      file: filePath,
      passed: filePassed,
      totalIssues,
      counts: fileCounts,
      ...(filePassed
        ? {}
        : {
            hint: `Use the fix_package_docs tool with target "${filePath}" to get detailed issues with source context and fix templates.`,
          }),
    };
  }

  const actionable =
    stats.counts.missingComments +
    stats.counts.missingReturns +
    stats.counts.paramDocMismatches +
    stats.counts.missingComplexTypeInfo +
    stats.counts.isAnyType;

  const pending = stats.counts.missingExports;
  const passed = actionable === 0;

  return {
    package: pkg.id,
    directory: pkg.directory,
    passed,
    totalIssues: actionable + pending,
    actionable,
    pending,
    counts: {
      apiCount: stats.counts.apiCount,
      missingComments: stats.counts.missingComments,
      missingReturns: stats.counts.missingReturns,
      paramDocMismatches: stats.counts.paramDocMismatches,
      missingComplexTypeInfo: stats.counts.missingComplexTypeInfo,
      isAnyType: stats.counts.isAnyType,
      missingExports: stats.counts.missingExports,
    },
    ...(passed
      ? {}
      : {
          hint: `Use the fix_package_docs tool with target "${input.target}" to get detailed issues with source context and fix templates.`,
        }),
  };
};

export const checkPackageDocsTool: ToolDefinition<typeof checkPackageDocsInputSchema> = {
  name: 'check_package_docs',
  description:
    'Check a Kibana plugin or package for documentation issues. Returns pass/fail status and issue counts. Use this for quick validation before deciding to fix issues.',
  inputSchema: checkPackageDocsInputSchema,
  handler: async (input) => {
    const result = await checkPackageDocs(input);
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
