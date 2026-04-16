/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
import type {
  VisualRegressionManifest,
  VisualRegressionManifestSummary,
  VisualRegressionRunManifest,
  VisualRegressionTarget,
} from '@kbn/scout-vrt';

interface ModuleDiscoveryConfig {
  path: string;
  serverRunFlags: string[];
}

export interface ModuleDiscoveryInfo {
  configs: ModuleDiscoveryConfig[];
}

export interface PlannedVisualBaselineRun {
  configPath: string;
  visualTestFiles: string[];
}

export interface PlannedVisualBaselineRunGroup {
  target: VisualRegressionTarget;
  serverRunFlags: string;
  runIdSuffix: string;
  selections: PlannedVisualBaselineRun[];
}

export interface VisualBaselineBundle {
  relativePath: string;
  browser: string;
  viewport?: {
    width: number;
    height: number;
  };
  runManifest: VisualRegressionRunManifest;
  packageManifests: VisualRegressionManifest[];
  imagePaths: string[];
}

export interface VisualBaselineCatalogEntry {
  target: VisualRegressionTarget;
  browser: string;
  viewport?: {
    width: number;
    height: number;
  };
  relativePath: string;
  manifestPath: string;
  archivePath?: string;
  packageCount: number;
  packageIds: string[];
}

export interface VisualBaselineCatalog {
  schemaVersion: 1;
  baselineKind: 'main';
  branch: 'main';
  commitSha: string;
  runIds: string[];
  generatedAt: string;
  bundles: VisualBaselineCatalogEntry[];
}

interface VisualRunSelection {
  configPath: string;
  visualTestFiles: string[];
}

const normalizePath = (filePath: string): string => filePath.split(path.sep).join('/');

const summaryFromPackages = (
  packages: Array<Pick<VisualRegressionRunManifest['packages'][number], 'summary'>>
): VisualRegressionManifestSummary =>
  packages.reduce<VisualRegressionManifestSummary>(
    (summary, currentPackage) => ({
      tests: summary.tests + currentPackage.summary.tests,
      checkpoints: summary.checkpoints + currentPackage.summary.checkpoints,
      passed: summary.passed + currentPackage.summary.passed,
      failed: summary.failed + currentPackage.summary.failed,
      captured: summary.captured + currentPackage.summary.captured,
      updated: summary.updated + currentPackage.summary.updated,
      missingBaselines: summary.missingBaselines + currentPackage.summary.missingBaselines,
      diffs: summary.diffs + currentPackage.summary.diffs,
    }),
    {
      tests: 0,
      checkpoints: 0,
      passed: 0,
      failed: 0,
      captured: 0,
      updated: 0,
      missingBaselines: 0,
      diffs: 0,
    }
  );

const sortPackages = <T extends { packageId: string }>(packages: T[]): T[] =>
  [...packages].sort((left, right) => left.packageId.localeCompare(right.packageId));

export const parseServerRunFlags = (serverRunFlags: string): VisualRegressionTarget => {
  const archMatch = serverRunFlags.match(/--arch\s+(\S+)/);
  const domainMatch = serverRunFlags.match(/--domain\s+(\S+)/);

  if (!archMatch || !domainMatch) {
    throw new Error(
      `Expected serverRunFlags to include '--arch' and '--domain': ${serverRunFlags}`
    );
  }

  return {
    location: 'local',
    arch: archMatch[1],
    domain: domainMatch[1],
  };
};

const createRunIdSuffix = ({ arch, domain }: VisualRegressionTarget): string => `${arch}-${domain}`;

export const buildMainBaselineRunPlan = (
  selections: VisualRunSelection[],
  moduleDiscovery: ModuleDiscoveryInfo[]
): PlannedVisualBaselineRunGroup[] => {
  const flagsByConfigPath = new Map<string, Set<string>>();

  for (const module of moduleDiscovery) {
    for (const config of module.configs) {
      const configPath = normalizePath(config.path);
      const configFlags = flagsByConfigPath.get(configPath) ?? new Set<string>();

      for (const serverRunFlags of config.serverRunFlags) {
        configFlags.add(serverRunFlags.trim());
      }

      flagsByConfigPath.set(configPath, configFlags);
    }
  }

  const groups = new Map<string, PlannedVisualBaselineRunGroup>();

  for (const selection of selections) {
    const normalizedConfigPath = normalizePath(selection.configPath);
    const configFlags = flagsByConfigPath.get(normalizedConfigPath);

    if (!configFlags || configFlags.size === 0) {
      continue;
    }

    for (const serverRunFlags of Array.from(configFlags).sort((left, right) =>
      left.localeCompare(right)
    )) {
      const target = parseServerRunFlags(serverRunFlags);
      const groupKey = `${target.location}:${target.arch}:${target.domain}`;
      const existingGroup = groups.get(groupKey);
      const plannedSelection = {
        configPath: normalizedConfigPath,
        visualTestFiles: [...selection.visualTestFiles].sort((left, right) =>
          left.localeCompare(right)
        ),
      };

      if (existingGroup) {
        const existing = existingGroup.selections.find(
          (s) => s.configPath === plannedSelection.configPath
        );
        if (existing) {
          const merged = new Set([...existing.visualTestFiles, ...plannedSelection.visualTestFiles]);
          existing.visualTestFiles = Array.from(merged).sort((a, b) => a.localeCompare(b));
        } else {
          existingGroup.selections.push(plannedSelection);
        }
        continue;
      }

      groups.set(groupKey, {
        target,
        serverRunFlags,
        runIdSuffix: createRunIdSuffix(target),
        selections: [plannedSelection],
      });
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      selections: group.selections.sort((left, right) =>
        left.configPath.localeCompare(right.configPath)
      ),
    }))
    .sort(
      (left, right) =>
        left.target.location.localeCompare(right.target.location) ||
        left.target.arch.localeCompare(right.target.arch) ||
        left.target.domain.localeCompare(right.target.domain)
    );
};

const toViewportKey = (viewport?: { width: number; height: number }): string =>
  viewport ? `${viewport.width}x${viewport.height}` : 'default';

const createBundleRelativePath = (
  target: VisualRegressionTarget,
  browser: string,
  viewport?: { width: number; height: number }
): string =>
  path.posix.join(target.location, target.arch, target.domain, browser, toViewportKey(viewport));

export const createVisualBaselineBundleArchivePath = (relativePath: string): string =>
  `${relativePath}.tar.gz`;

export const createVisualBaselineBundles = (
  runManifest: VisualRegressionRunManifest,
  packageManifests: VisualRegressionManifest[]
): VisualBaselineBundle[] => {
  const manifestsByPackageId = new Map(
    packageManifests.map((manifest) => [manifest.packageId, manifest] as const)
  );
  const groups = new Map<string, VisualBaselineBundle>();

  for (const pkg of sortPackages(runManifest.packages)) {
    const packageManifest = manifestsByPackageId.get(pkg.packageId);

    if (!packageManifest) {
      throw new Error(
        `Missing package manifest for package '${pkg.packageId}' in run '${runManifest.runId}'`
      );
    }

    const bundlePath = createBundleRelativePath(runManifest.target, pkg.browser, pkg.viewport);
    const existingBundle = groups.get(bundlePath);

    if (existingBundle) {
      existingBundle.packageManifests.push(packageManifest);
      existingBundle.imagePaths.push(...packageManifest.results.map(({ imagePath }) => imagePath));
      existingBundle.runManifest.packages.push(pkg);
      continue;
    }

    groups.set(bundlePath, {
      relativePath: bundlePath,
      browser: pkg.browser,
      viewport: pkg.viewport,
      runManifest: {
        ...runManifest,
        execution: {
          packageCount: 1,
          browsers: [pkg.browser],
          viewports: pkg.viewport ? [pkg.viewport] : [],
        },
        summary: pkg.summary,
        packages: [pkg],
      },
      packageManifests: [packageManifest],
      imagePaths: packageManifest.results.map(({ imagePath }) => imagePath),
    });
  }

  return Array.from(groups.values())
    .map((bundle) => {
      const sortedPackageManifests = sortPackages(bundle.packageManifests);
      const sortedRunPackages = sortPackages(bundle.runManifest.packages);
      return {
        ...bundle,
        runManifest: {
          ...bundle.runManifest,
          execution: {
            packageCount: sortedRunPackages.length,
            browsers: [bundle.browser],
            viewports: bundle.viewport ? [bundle.viewport] : [],
          },
          summary: summaryFromPackages(sortedRunPackages),
          packages: sortedRunPackages,
        },
        packageManifests: sortedPackageManifests,
        imagePaths: Array.from(new Set(bundle.imagePaths)).sort((left, right) =>
          left.localeCompare(right)
        ),
      };
    })
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath));
};

export const createVisualBaselineCatalog = (
  commitSha: string,
  generatedAt: string,
  bundles: VisualBaselineBundle[]
): VisualBaselineCatalog => ({
  schemaVersion: 1,
  baselineKind: 'main',
  branch: 'main',
  commitSha,
  runIds: Array.from(new Set(bundles.map(({ runManifest }) => runManifest.runId))).sort(
    (left, right) => left.localeCompare(right)
  ),
  generatedAt,
  bundles: bundles.map((bundle) => ({
    target: bundle.runManifest.target,
    browser: bundle.browser,
    viewport: bundle.viewport,
    relativePath: bundle.relativePath,
    manifestPath: path.posix.join(bundle.relativePath, 'manifest.json'),
    archivePath: createVisualBaselineBundleArchivePath(bundle.relativePath),
    packageCount: bundle.runManifest.packages.length,
    packageIds: bundle.runManifest.packages.map(({ packageId }) => packageId),
  })),
});
