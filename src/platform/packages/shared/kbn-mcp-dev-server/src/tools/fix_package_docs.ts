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
import { type FlatStatEntry, type FlatStats, generateStats, resolveTarget } from './docs_utils';

interface EnrichedIssue {
  issueType: string;
  id: string;
  label: string;
  file: string;
  line?: number;
  column?: number;
  link: string;
  type: string;
  sourceSnippet?: string;
  template?: string;
}

interface FileGroup {
  file: string;
  issues: EnrichedIssue[];
}

const SNIPPET_CONTEXT_LINES = 3;

/**
 * Reads a few lines of source context around a given line number.
 */
const getSourceSnippet = (filePath: string, lineNumber?: number): string | undefined => {
  if (!lineNumber) {
    return undefined;
  }

  const absolutePath = Path.resolve(REPO_ROOT, filePath);
  if (!fs.existsSync(absolutePath)) {
    return undefined;
  }

  try {
    const content = fs.readFileSync(absolutePath, 'utf-8');
    const lines = content.split('\n');
    const startLine = Math.max(0, lineNumber - SNIPPET_CONTEXT_LINES - 1);
    const endLine = Math.min(lines.length, lineNumber + SNIPPET_CONTEXT_LINES);
    return lines
      .slice(startLine, endLine)
      .map((line, idx) => `${startLine + idx + 1}| ${line}`)
      .join('\n');
  } catch {
    return undefined;
  }
};

/**
 * Generates a mechanical template for the agent to complete.
 */
const getTemplate = (issueType: string, entry: FlatStatEntry): string | undefined => {
  switch (issueType) {
    case 'missingReturns':
      return `@returns {TYPE}`;
    case 'missingComments':
      return `/** Description for ${entry.label}. */`;
    case 'paramDocMismatches':
      return `@param {TYPE} paramName -`;
    case 'missingComplexTypeInfo':
      return `/** Description for ${entry.label}. */`;
    default:
      return undefined;
  }
};

/**
 * Enriches a stat entry with source snippet and template.
 */
const enrichEntry = (issueType: string, entry: FlatStatEntry): EnrichedIssue => ({
  issueType,
  id: entry.id,
  label: entry.label,
  file: entry.path,
  line: entry.lineNumber,
  column: entry.columnNumber,
  link: entry.link,
  type: entry.type,
  sourceSnippet: getSourceSnippet(entry.path, entry.lineNumber),
  template: getTemplate(issueType, entry),
});

/**
 * Groups issues by file path.
 */
const groupByFile = (issues: EnrichedIssue[]): FileGroup[] => {
  const groups = new Map<string, EnrichedIssue[]>();

  for (const issue of issues) {
    const existing = groups.get(issue.file) ?? [];
    existing.push(issue);
    groups.set(issue.file, existing);
  }

  return Array.from(groups.entries())
    .map(([file, fileIssues]) => ({ file, issues: fileIssues }))
    .sort((a, b) => a.file.localeCompare(b.file));
};

const fixPackageDocsInputSchema = z.object({
  target: z
    .string()
    .describe(
      'The plugin ID (e.g., "dashboard"), manifest ID (e.g., "@kbn/dashboard-plugin"), or file path to get issues for.'
    ),
  type: z
    .enum(['plugin', 'package', 'file'])
    .optional()
    .describe(
      'How to interpret the target. If omitted, auto-detected: paths containing "/" are treated as files; otherwise tries plugin ID first, then manifest ID.'
    ),
  issueTypes: z
    .array(
      z.enum([
        'missingComments',
        'missingReturns',
        'paramDocMismatches',
        'missingComplexTypeInfo',
        'isAnyType',
        'missingExports',
      ])
    )
    .optional()
    .describe(
      'Filter to specific issue types. Defaults to actionable types (missingComments, missingReturns, paramDocMismatches, missingComplexTypeInfo, isAnyType). Use "missingExports" explicitly to include export issues, which are informational and often require changes in consuming packages.'
    ),
});

const fixPackageDocs = async (input: z.infer<typeof fixPackageDocsInputSchema>) => {
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

  const defaultIssueTypes = [
    'missingComments',
    'missingReturns',
    'paramDocMismatches',
    'missingComplexTypeInfo',
    'isAnyType',
  ] as const;

  const issueTypesToInclude = input.issueTypes ?? defaultIssueTypes;

  let allIssues: EnrichedIssue[] = [];

  if (issueTypesToInclude.includes('missingComments')) {
    allIssues.push(...stats.missingComments.map((e) => enrichEntry('missingComments', e)));
  }
  if (issueTypesToInclude.includes('missingReturns')) {
    allIssues.push(...stats.missingReturns.map((e) => enrichEntry('missingReturns', e)));
  }
  if (issueTypesToInclude.includes('paramDocMismatches')) {
    allIssues.push(...stats.paramDocMismatches.map((e) => enrichEntry('paramDocMismatches', e)));
  }
  if (issueTypesToInclude.includes('missingComplexTypeInfo')) {
    allIssues.push(
      ...stats.missingComplexTypeInfo.map((e) => enrichEntry('missingComplexTypeInfo', e))
    );
  }
  if (issueTypesToInclude.includes('isAnyType')) {
    allIssues.push(...stats.isAnyType.map((e) => enrichEntry('isAnyType', e)));
  }

  if (filePath) {
    const normalizedPath = filePath.startsWith('/') ? filePath : Path.resolve(REPO_ROOT, filePath);
    const relativePath = Path.relative(REPO_ROOT, normalizedPath);
    allIssues = allIssues.filter((issue) => issue.file === relativePath || issue.file === filePath);
  }

  const groupedIssues = groupByFile(allIssues);

  const includeMissingExports = input.issueTypes?.includes('missingExports') ?? false;
  const missingExports = includeMissingExports ? stats.missingExports : [];
  const totalIssues = allIssues.length + missingExports.length;

  return {
    package: pkg.id,
    directory: pkg.directory,
    file: filePath,
    totalIssues,
    issuesByFile: groupedIssues,
    missingExports,
  };
};

export const fixPackageDocsTool: ToolDefinition<typeof fixPackageDocsInputSchema> = {
  name: 'fix_package_docs',
  description:
    'Get detailed documentation issues for a Kibana plugin, package, or file. Returns issues grouped by file with source context and fix templates. Use this after check_package_docs identifies problems.',
  inputSchema: fixPackageDocsInputSchema,
  handler: async (input) => {
    const result = await fixPackageDocs(input);
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
