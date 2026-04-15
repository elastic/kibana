/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs';
import path from 'node:path';
import type { VisualCheckpointRecord } from '../playwright/runtime/types';
import type { VisualRegressionManifest } from '../playwright/reporting/manifest';

const PIXELMATCH_THRESHOLD = 0.1;

export interface DriftikScreenshotEntry {
  plugin: string;
  testName: string;
  screenshotName: string;
  baselinePath: string;
  candidatePath: string;
  diffPath?: string;
  width: number;
  height: number;
  mismatchPixels: number;
  mismatchRatio: number;
  threshold: number;
}

export interface DriftikManifest {
  generatedAt: string;
  baselineDir: string;
  candidateDir: string;
  diffDir?: string;
  entries: DriftikScreenshotEntry[];
}

export const readPngDimensions = (
  filePath: string
): { width: number; height: number } | undefined => {
  try {
    const fd = fs.openSync(filePath, 'r');
    const header = Buffer.alloc(24);
    fs.readSync(fd, header, 0, 24, 0);
    fs.closeSync(fd);

    // PNG signature is 8 bytes, then IHDR chunk: 4 bytes length + 4 bytes type + 4 bytes width + 4 bytes height
    if (header[0] !== 0x89 || header[1] !== 0x50) {
      return undefined;
    }

    const width = header.readUInt32BE(16);
    const height = header.readUInt32BE(20);
    return { width, height };
  } catch {
    return undefined;
  }
};

const copyFileToSite = (sourcePath: string, destinationPath: string): boolean => {
  if (!fs.existsSync(sourcePath)) {
    return false;
  }

  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.copyFileSync(sourcePath, destinationPath);
  return true;
};

export interface StageReviewSiteOptions {
  siteRoot: string;
  baselinesRoot: string;
  artifactsRoot: string;
  runId: string;
}

const formatPluginLabel = (packageId: string, target: { arch: string; domain: string }): string =>
  `${packageId} (${target.arch}/${target.domain})`;

const toDriftikEntry = (
  result: VisualCheckpointRecord,
  packageId: string,
  target: { arch: string; domain: string },
  options: StageReviewSiteOptions
): DriftikScreenshotEntry | undefined => {
  const baselineRelative = path.join('diff', 'images', 'baseline', result.imagePath);
  const candidateRelative = path.join('diff', 'images', 'candidate', result.imagePath);

  const baselineSource = path.join(options.baselinesRoot, result.imagePath);
  const candidateSource = path.join(options.artifactsRoot, result.imagePath);

  copyFileToSite(baselineSource, path.join(options.siteRoot, baselineRelative));
  const candidateCopied = copyFileToSite(
    candidateSource,
    path.join(options.siteRoot, candidateRelative)
  );

  if (!candidateCopied) {
    return undefined;
  }

  let diffRelative: string | undefined;

  if (result.diffPath) {
    const diffSource = path.join(options.artifactsRoot, result.diffPath);
    diffRelative = path.join('diff', 'images', 'diff', result.diffPath);
    copyFileToSite(diffSource, path.join(options.siteRoot, diffRelative));
  }

  const dimensions = readPngDimensions(path.join(options.siteRoot, candidateRelative)) ?? {
    width: 1280,
    height: 720,
  };

  return {
    plugin: formatPluginLabel(packageId, target),
    testName: result.testTitle,
    screenshotName: result.snapshotName,
    baselinePath: baselineRelative,
    candidatePath: candidateRelative,
    diffPath: diffRelative,
    width: dimensions.width,
    height: dimensions.height,
    mismatchPixels: 0,
    mismatchRatio: (result.mismatchPercent ?? 0) / 100,
    threshold: PIXELMATCH_THRESHOLD,
  };
};

export const generateDriftikManifest = (
  packageManifests: VisualRegressionManifest[],
  options: StageReviewSiteOptions
): DriftikManifest => {
  const entries: DriftikScreenshotEntry[] = [];

  for (const packageManifest of packageManifests) {
    for (const result of packageManifest.results) {
      const entry = toDriftikEntry(result, packageManifest.packageId, packageManifest.target, options);

      if (entry) {
        entries.push(entry);
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    baselineDir: 'diff/images/baseline',
    candidateDir: 'diff/images/candidate',
    diffDir: 'diff/images/diff',
    entries,
  };
};

export interface BuildReviewSiteOptions {
  siteRoot: string;
  driftikDistDir: string;
  baselinesRoot: string;
  artifactsRoot: string;
  runId: string;
}

export const buildDriftikReviewSite = (
  packageManifests: VisualRegressionManifest[],
  options: BuildReviewSiteOptions
): void => {
  fs.mkdirSync(options.siteRoot, { recursive: true });

  // Copy Driftik dist/ contents to site root
  copyDriftikDist(options.driftikDistDir, options.siteRoot);

  const stageOptions: StageReviewSiteOptions = {
    siteRoot: options.siteRoot,
    baselinesRoot: options.baselinesRoot,
    artifactsRoot: options.artifactsRoot,
    runId: options.runId,
  };

  const manifest = generateDriftikManifest(packageManifests, stageOptions);

  // Write the Driftik adapter manifest
  const manifestDir = path.join(options.siteRoot, 'diff');
  fs.mkdirSync(manifestDir, { recursive: true });
  fs.writeFileSync(path.join(manifestDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
};

const copyDriftikDist = (distDir: string, siteRoot: string) => {
  if (!fs.existsSync(distDir)) {
    throw new Error(`Driftik dist directory not found: ${distDir}`);
  }

  const copyRecursive = (source: string, destination: string) => {
    const stat = fs.statSync(source);

    if (stat.isDirectory()) {
      fs.mkdirSync(destination, { recursive: true });

      for (const entry of fs.readdirSync(source)) {
        // Skip existing diff directory from Driftik's sample data
        if (source === distDir && entry === 'diff') {
          continue;
        }

        copyRecursive(path.join(source, entry), path.join(destination, entry));
      }
    } else {
      fs.copyFileSync(source, destination);
    }
  };

  copyRecursive(distDir, siteRoot);
};
