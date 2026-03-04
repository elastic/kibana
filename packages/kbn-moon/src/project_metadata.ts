/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Fs from 'fs';
import Path from 'path';

import { load as loadYaml } from 'js-yaml';

import { REPO_ROOT } from '@kbn/repo-info';

import { MOON_CONST } from './const';

interface MoonYamlConfig {
  id?: unknown;
  dependsOn?: unknown;
  project?: {
    metadata?: {
      sourceRoot?: unknown;
    };
  };
}

export interface MoonProjectMetadata {
  id: string;
  sourceRoot: string;
  dependsOn: string[];
}

// Changing workspace config can alter how Moon computes touched files.
export const MOON_AFFECTED_QUERY_DEPENDENCY_PATHS = ['.moon/workspace.yml'];

export const MOON_PROJECT_CONFIG_PATTERNS = [
  MOON_CONST.MOON_CONFIG_FILE_NAME,
  `src/**/${MOON_CONST.MOON_CONFIG_FILE_NAME}`,
  `x-pack/**/${MOON_CONST.MOON_CONFIG_FILE_NAME}`,
  `examples/**/${MOON_CONST.MOON_CONFIG_FILE_NAME}`,
  `packages/**/${MOON_CONST.MOON_CONFIG_FILE_NAME}`,
];

const dedupeSorted = (values: string[]): string[] => {
  const unique = [...new Set(values)];
  unique.sort();
  return unique;
};

const normalizePathSeparators = (value: string): string => value.split(Path.sep).join('/');

export const isMoonAffectedQueryDependencyPath = (filePath: string): boolean =>
  MOON_AFFECTED_QUERY_DEPENDENCY_PATHS.some((path) => filePath === path);

export const getMoonProjectConfigPaths = (repoRoot: string = REPO_ROOT): string[] => {
  const collected: string[] = [];

  for (const pattern of MOON_PROJECT_CONFIG_PATTERNS) {
    collected.push(...Fs.globSync(pattern, { cwd: repoRoot }));
  }

  return dedupeSorted(collected);
};

export const readMoonProjects = (repoRoot: string = REPO_ROOT): MoonProjectMetadata[] => {
  const moonConfigPaths = getMoonProjectConfigPaths(repoRoot);
  const projects: MoonProjectMetadata[] = [];

  for (const moonConfigPath of moonConfigPaths) {
    const fullPath = Path.resolve(repoRoot, moonConfigPath);
    const parsed = loadYaml(Fs.readFileSync(fullPath, 'utf8')) as MoonYamlConfig | undefined;

    const id = parsed?.id;
    const sourceRoot = parsed?.project?.metadata?.sourceRoot;
    if (!parsed || typeof id !== 'string' || typeof sourceRoot !== 'string') {
      continue;
    }

    const dependsOn = Array.isArray(parsed.dependsOn)
      ? parsed.dependsOn.filter((value): value is string => typeof value === 'string')
      : [];

    projects.push({
      id,
      sourceRoot: normalizePathSeparators(sourceRoot),
      dependsOn,
    });
  }

  return projects;
};

export const getAffectedMoonProjectIds = (
  touchedFiles: string[],
  moonProjects: MoonProjectMetadata[] = readMoonProjects()
): string[] => {
  const directlyAffected = new Set<string>();

  for (const project of moonProjects) {
    if (project.sourceRoot === '.') {
      continue;
    }

    if (
      touchedFiles.some(
        (file) => file === project.sourceRoot || file.startsWith(`${project.sourceRoot}/`)
      )
    ) {
      directlyAffected.add(project.id);
    }
  }

  const dependentsByProject = new Map<string, string[]>();
  for (const project of moonProjects) {
    for (const dependency of project.dependsOn) {
      const dependents = dependentsByProject.get(dependency) ?? [];
      dependents.push(project.id);
      dependentsByProject.set(dependency, dependents);
    }
  }

  const queue = [...directlyAffected];
  const affected = new Set(queue);

  while (queue.length > 0) {
    const projectId = queue.shift()!;
    const dependents = dependentsByProject.get(projectId) ?? [];
    for (const dependent of dependents) {
      if (affected.has(dependent)) {
        continue;
      }

      affected.add(dependent);
      queue.push(dependent);
    }
  }

  return dedupeSorted([...affected]);
};
