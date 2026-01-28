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
import execa from 'execa';
import { getPackages } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';

import type { ToolDefinition } from '../types';

interface StatEntry {
  id: string;
  label: string;
  path: string;
  type: string;
  lineNumber?: number;
  columnNumber?: number;
  link: string;
}

interface MissingExportEntry {
  source: string;
  references: string[];
}

interface FlatStats {
  counts: {
    apiCount: number;
    missingExports: number;
    missingComments: number;
    isAnyType: number;
    noReferences: number;
    missingReturns: number;
    paramDocMismatches: number;
    missingComplexTypeInfo: number;
  };
  missingComments: StatEntry[];
  isAnyType: StatEntry[];
  noReferences: StatEntry[];
  missingReturns: StatEntry[];
  paramDocMismatches: StatEntry[];
  missingComplexTypeInfo: StatEntry[];
  missingExports: MissingExportEntry[];
}

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
  if (!lineNumber) return undefined;

  const absolutePath = Path.resolve(REPO_ROOT, filePath);
  if (!fs.existsSync(absolutePath)) return undefined;

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
const getTemplate = (issueType: string, entry: StatEntry): string | undefined => {
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
const enrichEntry = (issueType: string, entry: StatEntry): EnrichedIssue => ({
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

interface PackageInfo {
  pkg: ReturnType<typeof getPackages>[number];
  /** The CLI flag to use: '--plugin' for plugins, '--package' for packages. */
  cliFlag: '--plugin' | '--package';
  /** The ID to pass to the CLI (plugin.id for plugins, manifest.id for packages). */
  cliId: string;
}

type FindPackageResult =
  | {
      found: true;
      info: PackageInfo;
    }
  | {
      found: false;
      suggestions: string[];
    };

/**
 * Finds a package by ID and returns the appropriate CLI flag and ID.
 *
 * For plugins, returns the plugin.id to use with --plugin.
 * For packages, returns the manifest.id to use with --package.
 */
const findPackage = (packageId: string): FindPackageResult => {
  const packages = getPackages(REPO_ROOT);
  const normalizedId = packageId.toLowerCase();

  // First, try to find by package manifest ID (e.g., @kbn/dashboard-plugin).
  const byManifestId = packages.find((pkg) => pkg.manifest.id === packageId);
  if (byManifestId) {
    if (byManifestId.isPlugin()) {
      return {
        found: true,
        info: {
          pkg: byManifestId,
          cliFlag: '--plugin',
          cliId: byManifestId.manifest.plugin.id,
        },
      };
    }
    return {
      found: true,
      info: {
        pkg: byManifestId,
        cliFlag: '--package',
        cliId: byManifestId.manifest.id,
      },
    };
  }

  // Second, try to find by plugin ID (e.g., dashboard).
  const byPluginId = packages.find((pkg) => pkg.isPlugin() && pkg.manifest.plugin.id === packageId);
  if (byPluginId && byPluginId.isPlugin()) {
    return {
      found: true,
      info: {
        pkg: byPluginId,
        cliFlag: '--plugin',
        cliId: byPluginId.manifest.plugin.id,
      },
    };
  }

  // Not found - collect suggestions for helpful error message.
  const suggestions: string[] = [];

  // Find packages/plugins that contain the search term.
  for (const pkg of packages) {
    const manifestId = pkg.manifest.id.toLowerCase();
    if (pkg.isPlugin()) {
      const pluginId = pkg.manifest.plugin.id.toLowerCase();
      if (pluginId.includes(normalizedId) || manifestId.includes(normalizedId)) {
        suggestions.push(`${pkg.manifest.plugin.id} (${pkg.manifest.id})`);
      }
    } else if (manifestId.includes(normalizedId)) {
      suggestions.push(pkg.manifest.id);
    }
  }

  return { found: false, suggestions: suggestions.slice(0, 5) };
};

/**
 * Finds the package that contains a given file path.
 */
const findPackageForFile = (filePath: string): PackageInfo | undefined => {
  const packages = getPackages(REPO_ROOT);
  const absolutePath = Path.resolve(REPO_ROOT, filePath);
  const pkg = packages.find((p) => absolutePath.startsWith(p.directory));

  if (!pkg) return undefined;

  if (pkg.isPlugin()) {
    return {
      pkg,
      cliFlag: '--plugin',
      cliId: pkg.manifest.plugin.id,
    };
  }
  return {
    pkg,
    cliFlag: '--package',
    cliId: pkg.manifest.id,
  };
};

/**
 * Detects the target type based on the target string.
 * Scoped package names (starting with @) are treated as IDs.
 * Paths containing '/' are treated as files; otherwise treated as plugin/package IDs.
 */
const detectTargetType = (target: string): 'file' | 'id' => {
  // Scoped package names like @kbn/dashboard-plugin are IDs, not files.
  if (target.startsWith('@')) {
    return 'id';
  }
  // Paths containing '/' are files.
  if (target.includes('/')) {
    return 'file';
  }
  return 'id';
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

/**
 * Runs the check_package_docs CLI to generate fresh stats.
 */
const generateStats = async (
  cliFlag: '--plugin' | '--package',
  cliId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await execa('node', ['scripts/check_package_docs', cliFlag, cliId, '--write'], {
      cwd: REPO_ROOT,
      timeout: 120000,
    });
    return { success: true };
  } catch (err: unknown) {
    // Exit code 1 means validation failed (issues found) - this is expected.
    if (
      err &&
      typeof err === 'object' &&
      'exitCode' in err &&
      (err as { exitCode: number }).exitCode === 1
    ) {
      return { success: true };
    }

    // Extract meaningful error information from execa error.
    if (err && typeof err === 'object') {
      const execaErr = err as { stderr?: string; stdout?: string; message?: string };
      // Prefer stderr as it usually contains the actual error.
      if (execaErr.stderr && execaErr.stderr.trim()) {
        return { success: false, error: execaErr.stderr.trim() };
      }
      if (execaErr.message) {
        return { success: false, error: execaErr.message };
      }
    }

    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
};

const fixPackageDocs = async (input: z.infer<typeof fixPackageDocsInputSchema>) => {
  const { target } = input;

  // Determine effective type: use explicit type or auto-detect.
  const effectiveType = input.type ?? (detectTargetType(target) === 'file' ? 'file' : 'plugin');

  let pkgInfo: PackageInfo | undefined;
  let filePath: string | undefined;

  if (effectiveType === 'file') {
    filePath = target;
    pkgInfo = findPackageForFile(target);
    if (!pkgInfo) {
      return {
        error: `Could not find a package containing file '${target}'.`,
      };
    }
  } else {
    // For 'plugin' type: try plugin ID first, then manifest ID (current findPackage behavior).
    // For 'package' type: try manifest ID only.
    const result = findPackage(target);
    if (!result.found) {
      let errorMsg = `Plugin or package '${target}' not found.`;
      if (result.suggestions.length > 0) {
        errorMsg += ` Did you mean: ${result.suggestions.join(', ')}?`;
      }
      return { error: errorMsg };
    }
    pkgInfo = result.info;
  }

  const { pkg, cliFlag, cliId } = pkgInfo;

  // Generate fresh stats by running the CLI.
  const genResult = await generateStats(cliFlag, cliId);
  if (!genResult.success) {
    return {
      error: `Failed to generate stats: ${genResult.error}`,
    };
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
    return {
      error: `Failed to parse stats file at ${statsPath}.`,
    };
  }

  // Default actionable issue types - these are documentation issues fixable within this package.
  // Excludes noReferences (informational) and missingExports (often requires changes in
  // consuming packages rather than documentation fixes).
  const defaultIssueTypes = [
    'missingComments',
    'missingReturns',
    'paramDocMismatches',
    'missingComplexTypeInfo',
    'isAnyType',
  ] as const;

  const issueTypesToInclude = input.issueTypes ?? defaultIssueTypes;

  // Collect all enriched issues
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

  // Filter by file if specified
  if (filePath) {
    const normalizedPath = filePath.startsWith('/') ? filePath : Path.resolve(REPO_ROOT, filePath);
    const relativePath = Path.relative(REPO_ROOT, normalizedPath);
    allIssues = allIssues.filter((issue) => issue.file === relativePath || issue.file === filePath);
  }

  // Group by file
  const groupedIssues = groupByFile(allIssues);

  // Handle missing exports separately (different structure).
  // missingExports are included in totalIssues when explicitly requested to maintain
  // consistency with check_package_docs which includes pending issues in totals.
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
