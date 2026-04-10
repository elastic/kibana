/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import fs from 'fs';

import yaml from 'js-yaml';

import { REPO_ROOT } from '@kbn/repo-info';
import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';

import { KIBANA_JSONC_FILENAME, MOON_CONST } from '../const';

const IGNORED_DIRS = new Set(['node_modules', 'target', '.git']);

/**
 * Recursively find all jest config files in the repo.
 */
const findAllJestConfigs = (dir: string): string[] => {
  const results: string[] = [];

  const walk = (currentDir: string) => {
    let entries: string[];
    try {
      entries = fs.readdirSync(currentDir);
    } catch {
      return;
    }

    for (const configName of MOON_CONST.JEST_CONFIG_FILES) {
      if (entries.includes(configName)) {
        const fullPath = path.join(currentDir, configName);
        try {
          if (fs.statSync(fullPath).isFile()) {
            results.push(path.relative(dir, fullPath));
          }
        } catch {
          // skip
        }
      }
    }

    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry)) {
        continue;
      }
      const fullPath = path.join(currentDir, entry);
      try {
        if (fs.statSync(fullPath).isDirectory()) {
          walk(fullPath);
        }
      } catch {
        // skip
      }
    }
  };

  walk(dir);
  return results.sort();
};

/**
 * Walk up from a directory to find the nearest kibana.jsonc (the owning Moon project).
 * Returns the project's sourceRoot relative to the repo root, or undefined if none found.
 */
const findOwningProject = (configRelPath: string): string | undefined => {
  let dir = path.dirname(path.resolve(REPO_ROOT, configRelPath));
  while (dir !== REPO_ROOT && dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, KIBANA_JSONC_FILENAME))) {
      return path.relative(REPO_ROOT, dir);
    }
    dir = path.dirname(dir);
  }
  return undefined;
};

/**
 * Read a moon.yml and extract the jest-config file group entries.
 */
const readMoonJestConfigs = (projectDir: string): string[] => {
  const moonPath = path.resolve(REPO_ROOT, projectDir, MOON_CONST.MOON_CONFIG_FILE_NAME);
  try {
    const content = fs.readFileSync(moonPath, 'utf8');
    const parsed = yaml.load(content) as Record<string, unknown>;
    const fileGroups = parsed?.fileGroups as Record<string, string[]> | undefined;
    return fileGroups?.['jest-config'] ?? [];
  } catch {
    return [];
  }
};

export function verifyJestConfigCoverage() {
  return run(
    async ({ log }) => {
      const allConfigs = findAllJestConfigs(REPO_ROOT);
      log.info(`Found ${allConfigs.length} jest config files in the repo`);

      const uncovered: string[] = [];
      const orphaned: string[] = [];

      for (const configRelPath of allConfigs) {
        const projectDir = findOwningProject(configRelPath);

        if (!projectDir) {
          orphaned.push(configRelPath);
          continue;
        }

        const moonConfigs = readMoonJestConfigs(projectDir);
        const configRelToProject = path.relative(projectDir, configRelPath);

        if (!moonConfigs.includes(configRelToProject)) {
          uncovered.push(configRelPath);
        }
      }

      if (orphaned.length > 0) {
        log.warning(
          `${orphaned.length} jest config(s) are not inside any Moon project (no kibana.jsonc ancestor):\n` +
            orphaned.map((c) => `  - ${c}`).join('\n')
        );
      }

      if (uncovered.length > 0) {
        log.error(
          `${uncovered.length} jest config(s) are inside a Moon project but missing from its jest-config file group.\n` +
            `Run 'node scripts/regenerate_moon_projects.js --update' to fix.\n` +
            uncovered.map((c) => `  - ${c}`).join('\n')
        );
        throw createFailError(
          `${uncovered.length} jest config(s) not covered by Moon. See above for details.`
        );
      }

      log.success(
        `All ${
          allConfigs.length - orphaned.length
        } jest configs in Moon projects are properly covered`
      );
    },
    {
      description:
        'Verify all jest config files are covered by their Moon project jest-config group',
    }
  );
}
