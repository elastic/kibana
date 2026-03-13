/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import type { TsProject } from '@kbn/ts-projects';

type TsPaths = Record<string, string[]>;
const tsgoRootPathTransforms: Record<string, string[] | null> = {
  '@elastic/opentelemetry-node/sdk': null,
  '@opentelemetry/api/build/src/metrics/Metric': [
    'node_modules/@opentelemetry/api/build/src/metrics/Metric',
  ],
  '@opentelemetry/semantic-conventions/incubating': null,
  canvg: ['node_modules/canvg/lib/index.d.ts'],
  'cypress/types/net-stubbing': ['node_modules/cypress/types/net-stubbing.d.ts'],
  'elasticsearch-8.x/lib/api/types': ['node_modules/elasticsearch-8.x/lib/api/types'],
  'zod/v4': ['node_modules/zod/v4/classic/index'],
};

const toRelativePath = (from: string, to: string): string => {
  const relative = Path.relative(from, to);
  return relative.startsWith('.') ? relative : `./${relative}`;
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const isTsPaths = (value: unknown): value is TsPaths =>
  typeof value === 'object' &&
  value !== null &&
  Object.values(value).every((entry) => isStringArray(entry));

const getBaseUrl = (project: TsProject): string | undefined => {
  const { baseUrl } = project.config.compilerOptions ?? {};
  return typeof baseUrl === 'string' ? baseUrl : undefined;
};

const getLocalPaths = (project: TsProject): TsPaths => {
  const { paths } = project.config.compilerOptions ?? {};
  return isTsPaths(paths) ? paths : {};
};

const rewriteLocalPaths = (
  project: TsProject,
  targetDirectory: string,
  baseUrl: string | undefined,
  localPaths: TsPaths
): TsPaths =>
  Object.fromEntries(
    Object.entries(localPaths).map(([key, targets]) => [
      key,
      targets.map((target) => normalizePathTarget(project, targetDirectory, target, baseUrl)),
    ])
  );

const normalizePathTarget = (
  project: TsProject,
  targetDirectory: string,
  target: string,
  baseUrl?: string
): string => {
  const resolutionRoot = baseUrl ? Path.resolve(project.directory, baseUrl) : project.directory;
  return toRelativePath(targetDirectory, Path.resolve(resolutionRoot, target));
};

export const hasLocalTsgoPathOverrides = (project: TsProject): boolean => {
  if (project.repoRel === 'tsconfig.base.json') {
    return true;
  }

  return getBaseUrl(project) !== undefined || Object.keys(getLocalPaths(project)).length > 0;
};

export const getTsgoPaths = (project: TsProject, targetDirectory = project.directory): TsPaths => {
  const baseProject = project.getBase();
  const localPaths = getLocalPaths(project);
  const baseUrl = getBaseUrl(project);
  const hasLocalPaths = Object.keys(localPaths).length > 0;
  const inheritedPaths =
    !hasLocalPaths && baseUrl && baseProject ? getTsgoPaths(baseProject, targetDirectory) : {};
  const mergedPaths: TsPaths = {
    ...inheritedPaths,
    ...rewriteLocalPaths(project, targetDirectory, baseUrl, localPaths),
  };

  if (baseUrl && !('*' in localPaths)) {
    mergedPaths['*'] = [normalizePathTarget(project, targetDirectory, '*', baseUrl)];
  }

  if (project.repoRel === 'tsconfig.base.json') {
    for (const [alias, targets] of Object.entries(tsgoRootPathTransforms)) {
      if (targets === null) {
        delete mergedPaths[alias];
      } else {
        mergedPaths[alias] = targets.map((target) =>
          normalizePathTarget(project, targetDirectory, target, baseUrl)
        );
      }
    }
  }

  return mergedPaths;
};
