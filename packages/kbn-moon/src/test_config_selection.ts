/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';

export type MoonTestKind = 'jest-unit' | 'jest-integration' | 'scout';

export interface MoonTestConfigProject {
  sourceRoot: string;
  configs: string[];
}

const normalized = (filePath: string): string => filePath.split(path.sep).join('/');
const inDirectory = (filePath: string, directory: string): boolean =>
  directory === '.' || filePath === directory || filePath.startsWith(`${directory}/`);
const isDocumentation = (filePath: string): boolean =>
  /(?:^|\/)(?:README[^/]*|CHANGELOG[^/]*)$/.test(filePath) || filePath.endsWith('.md');
const isTestFile = (filePath: string): boolean =>
  /\.(?:spec|test)\.(?:js|mjs|ts|tsx)$/.test(filePath);

const matchingScoutConfigs = (filePath: string, configs: string[]): string[] => {
  const changedConfig = configs.find((config) => config === filePath);
  if (changedConfig) return [changedConfig];

  const matches = configs.filter((config) => {
    const scope = path.posix.dirname(config);
    const testsDir = config.endsWith('/parallel.playwright.config.ts') ? 'parallel_tests' : 'tests';
    return filePath.startsWith(`${scope}/${testsDir}/`);
  });
  const longestScope = Math.max(0, ...matches.map((config) => path.posix.dirname(config).length));
  return matches.filter((config) => path.posix.dirname(config).length === longestScope);
};

/** Selects configs in affected projects, narrowing Scout-only changes. */
export const selectMoonTestConfigs = (
  projects: readonly MoonTestConfigProject[],
  changedFiles: readonly string[],
  kind: MoonTestKind
): string[] => {
  const selected = new Set<string>();
  const files = changedFiles.map(normalized).filter((filePath) => !isDocumentation(filePath));

  for (const project of projects) {
    const sourceRoot = normalized(project.sourceRoot);
    const configs = project.configs.map(normalized);
    if (kind !== 'scout') {
      configs.forEach((config) => selected.add(config));
      continue;
    }

    const relevantFiles = files.filter(
      (filePath) => inDirectory(filePath, sourceRoot) || !isTestFile(filePath)
    );
    const matches = relevantFiles.map((filePath) => matchingScoutConfigs(filePath, configs));
    const chosen =
      relevantFiles.length > 0 && matches.every((owned) => owned.length > 0)
        ? matches.flat()
        : configs;
    chosen.forEach((config) => selected.add(config));
  }

  return [...selected].sort();
};

/** Reads a selection request from stdin and writes config paths as JSON. */
export const runMoonTestConfigsCli = (): void => {
  let input = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk: string) => {
    input += chunk;
  });
  process.stdin.on('end', () => {
    const request = JSON.parse(input) as {
      projects: MoonTestConfigProject[];
      changedFiles: string[];
      kind: MoonTestKind;
    };
    process.stdout.write(
      JSON.stringify(selectMoonTestConfigs(request.projects, request.changedFiles, request.kind))
    );
  });
};
