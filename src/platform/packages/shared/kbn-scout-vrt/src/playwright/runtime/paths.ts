/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
import { REPO_ROOT } from '@kbn/repo-info';

export const getVisualRegressionRunRoot = (runId: string): string =>
  path.join(REPO_ROOT, '.scout', 'test-artifacts', 'vrt', runId);

export const getVisualRegressionBaselinesRoot = (): string =>
  path.join(REPO_ROOT, '.scout', 'baselines', 'vrt');

export const getVisualRegressionArtifactsDir = (runId: string): string =>
  path.join(getVisualRegressionRunRoot(runId), 'test-artifacts');

export const getVisualRegressionPackageArtifactsDir = (runId: string, packageId: string): string =>
  path.join(getVisualRegressionArtifactsDir(runId), packageId);

export const getVisualRegressionPlaywrightArtifactsDir = (runId: string): string =>
  path.join(getVisualRegressionRunRoot(runId), 'playwright-artifacts');

export const getVisualRegressionRunManifestPath = (runId: string): string =>
  path.join(getVisualRegressionRunRoot(runId), 'manifest.json');

export const getVisualRegressionTestArtifactsDir = (
  runId: string,
  packageId: string,
  testKey: string
): string => path.join(getVisualRegressionPackageArtifactsDir(runId, packageId), testKey);

export const getVisualRegressionImagePath = (
  packageId: string,
  testKey: string,
  snapshotName: string
): string => path.join(packageId, testKey, snapshotName);

export const getVisualRegressionBaselinePath = (
  packageId: string,
  testKey: string,
  snapshotName: string
): string =>
  path.join(
    getVisualRegressionBaselinesRoot(),
    getVisualRegressionImagePath(packageId, testKey, snapshotName)
  );

export const getVisualRegressionDiffImagePath = (
  packageId: string,
  testKey: string,
  snapshotName: string
): string => {
  const parsedName = path.parse(snapshotName);
  return path.join(packageId, testKey, `${parsedName.name}-diff${parsedName.ext}`);
};

export const getVisualRegressionActualPath = (
  runId: string,
  packageId: string,
  testKey: string,
  snapshotName: string
): string =>
  path.join(
    getVisualRegressionArtifactsDir(runId),
    getVisualRegressionImagePath(packageId, testKey, snapshotName)
  );

export const getVisualRegressionDiffPath = (
  runId: string,
  packageId: string,
  testKey: string,
  snapshotName: string
): string =>
  path.join(
    getVisualRegressionArtifactsDir(runId),
    getVisualRegressionDiffImagePath(packageId, testKey, snapshotName)
  );

export const getVisualRegressionManifestPath = (runId: string, packageId: string): string =>
  path.join(getVisualRegressionPackageArtifactsDir(runId, packageId), 'manifest.json');

export const toRunRelativePath = (runId: string, filePath: string): string =>
  path.relative(getVisualRegressionRunRoot(runId), filePath);

export const toRepoRelativePath = (filePath: string): string => {
  const relativePath = path.relative(REPO_ROOT, filePath);
  return relativePath.startsWith('..') ? filePath : relativePath;
};
