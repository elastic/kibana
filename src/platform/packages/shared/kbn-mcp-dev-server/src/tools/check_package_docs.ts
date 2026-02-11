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
  missingComments: Array<{ path: string }>;
  isAnyType: Array<{ path: string }>;
  missingReturns: Array<{ path: string }>;
  paramDocMismatches: Array<{ path: string }>;
  missingComplexTypeInfo: Array<{ path: string }>;
}

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

  // Generate fresh stats.
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

  // If filtering by file, count issues only for that file
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
      // Provide a hint for agents when there are issues to fix.
      ...(filePassed
        ? {}
        : {
            hint: `Use the fix_package_docs tool with target "${filePath}" to get detailed issues with source context and fix templates.`,
          }),
    };
  }

  // Actionable issues are documentation problems that can be fixed within this package.
  // Pending issues require human input or changes in other packages.
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
    // Provide a hint for agents when there are issues to fix.
    ...(passed
      ? {}
      : {
          hint: `Use the fix_package_docs tool with target "${target}" to get detailed issues with source context and fix templates.`,
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
