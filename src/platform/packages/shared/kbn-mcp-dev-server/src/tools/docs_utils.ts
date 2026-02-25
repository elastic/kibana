/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import execa from 'execa';
import { getPackages } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';

// ---------------------------------------------------------------------------
// Flat stats JSON schema — must match the output of `buildFlatStatsForPlugin`
// in `@kbn/docs-utils/src/cli/tasks/flat_stats.ts`.
// ---------------------------------------------------------------------------

/** Shape of a single stat entry in the flat JSON output. */
export interface FlatStatEntry {
  id: string;
  label: string;
  path: string;
  type: string;
  lineNumber?: number;
  columnNumber?: number;
  link: string;
}

/** Shape of a missing-export entry in the flat JSON output. */
export interface FlatMissingExportEntry {
  source: string;
  references: string[];
}

/** Complete flat stats JSON written per plugin/package. */
export interface FlatStats {
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
  missingComments: FlatStatEntry[];
  isAnyType: FlatStatEntry[];
  noReferences: FlatStatEntry[];
  missingReturns: FlatStatEntry[];
  paramDocMismatches: FlatStatEntry[];
  missingComplexTypeInfo: FlatStatEntry[];
  missingExports: FlatMissingExportEntry[];
}

// ---------------------------------------------------------------------------
// Package resolution helpers.
// ---------------------------------------------------------------------------

export interface PackageInfo {
  pkg: ReturnType<typeof getPackages>[number];
  /** The CLI flag to use: `--plugin` for plugins, `--package` for packages. */
  cliFlag: '--plugin' | '--package';
  /** The ID to pass to the CLI (`plugin.id` for plugins, `manifest.id` for packages). */
  cliId: string;
}

export type FindPackageResult =
  | { found: true; info: PackageInfo }
  | { found: false; suggestions: string[] };

/**
 * Finds a package by ID and returns the appropriate CLI flag and ID.
 *
 * For plugins, returns the `plugin.id` to use with `--plugin`.
 * For packages, returns the `manifest.id` to use with `--package`.
 */
export const findPackage = (packageId: string): FindPackageResult => {
  const packages = getPackages(REPO_ROOT);
  const normalizedId = packageId.toLowerCase();

  const byManifestId = packages.find((pkg) => pkg.manifest.id === packageId);
  if (byManifestId) {
    if (byManifestId.isPlugin()) {
      return {
        found: true,
        info: { pkg: byManifestId, cliFlag: '--plugin', cliId: byManifestId.manifest.plugin.id },
      };
    }
    return {
      found: true,
      info: { pkg: byManifestId, cliFlag: '--package', cliId: byManifestId.manifest.id },
    };
  }

  const byPluginId = packages.find((pkg) => pkg.isPlugin() && pkg.manifest.plugin.id === packageId);
  if (byPluginId && byPluginId.isPlugin()) {
    return {
      found: true,
      info: { pkg: byPluginId, cliFlag: '--plugin', cliId: byPluginId.manifest.plugin.id },
    };
  }

  const suggestions: string[] = [];
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
export const findPackageForFile = (filePath: string): PackageInfo | undefined => {
  const packages = getPackages(REPO_ROOT);
  const absolutePath = Path.resolve(REPO_ROOT, filePath);
  const pkg = packages.find((p) => absolutePath.startsWith(p.directory));

  if (!pkg) {
    return undefined;
  }

  if (pkg.isPlugin()) {
    return { pkg, cliFlag: '--plugin', cliId: pkg.manifest.plugin.id };
  }
  return { pkg, cliFlag: '--package', cliId: pkg.manifest.id };
};

/**
 * Detects the target type based on the target string.
 *
 * Scoped package names (starting with `@`) are treated as IDs.
 * Paths containing `/` are treated as files; otherwise treated as plugin/package IDs.
 */
export const detectTargetType = (target: string): 'file' | 'id' => {
  if (target.startsWith('@')) {
    return 'id';
  }
  if (target.includes('/')) {
    return 'file';
  }
  return 'id';
};

// ---------------------------------------------------------------------------
// CLI runner.
// ---------------------------------------------------------------------------

/**
 * Runs the `check_package_docs` CLI to generate fresh stats.
 */
export const generateStats = async (
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
    // Exit code 1 means validation failed (issues found) — this is expected.
    if (
      err &&
      typeof err === 'object' &&
      'exitCode' in err &&
      (err as { exitCode: number }).exitCode === 1
    ) {
      return { success: true };
    }

    if (err && typeof err === 'object') {
      const execaErr = err as { stderr?: string; stdout?: string; message?: string };
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

// ---------------------------------------------------------------------------
// Target resolution — shared across both MCP tools.
// ---------------------------------------------------------------------------

/**
 * Resolves the effective target type and locates the owning package.
 *
 * @returns The resolved `PackageInfo` and optional `filePath`, or an error string.
 */
export const resolveTarget = (
  target: string,
  explicitType?: 'plugin' | 'package' | 'file'
): { pkgInfo: PackageInfo; filePath?: string } | { error: string } => {
  const effectiveType = explicitType ?? (detectTargetType(target) === 'file' ? 'file' : 'plugin');

  if (effectiveType === 'file') {
    const pkgInfo = findPackageForFile(target);
    if (!pkgInfo) {
      return { error: `Could not find a package containing file '${target}'.` };
    }
    return { pkgInfo, filePath: target };
  }

  const result = findPackage(target);
  if (!result.found) {
    let errorMsg = `Plugin or package '${target}' not found.`;
    if (result.suggestions.length > 0) {
      errorMsg += ` Did you mean: ${result.suggestions.join(', ')}?`;
    }
    return { error: errorMsg };
  }
  return { pkgInfo: result.info };
};
