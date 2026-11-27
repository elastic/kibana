/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';

import fastGlob from 'fast-glob';
import { parse } from 'yaml';
import { ImportResolver } from '@kbn/import-resolver';
import { REPO_ROOT } from '@kbn/repo-info';
import { TESTABLE_COMPONENT_SCOUT_ROOT_PATH_GLOB } from '@kbn/scout-info';
import type { ToolingLog } from '@kbn/tooling-log';

import { checkImportGraph } from './check_import_graph';

/** FTR and Scout run in Node, which can't load EUI's ESM build (https://github.com/elastic/eui/pull/9751). */
export const TEST_RUNNER_BANNED_NODE_MODULES: ReadonlySet<string> = new Set(['@elastic/eui']);

const readFile = (path: string): string => Fs.readFileSync(Path.resolve(REPO_ROOT, path), 'utf8');

/** Every FTR config in the CI manifests, enabled or not. */
const findFtrConfigs = (): string[] => {
  const { stateful, serverless } = JSON.parse(
    readFile('.buildkite/ftr-manifests/ftr_configs_manifests.json')
  ) as Record<'stateful' | 'serverless', string[]>;

  const configs = [...stateful, ...serverless].flatMap((manifest) => {
    const { enabled = [], disabled = [] } = parse(readFile(manifest)) as {
      enabled?: Array<string | Record<string, unknown>>;
      disabled?: string[];
    };
    return [...enabled, ...disabled].map((config) =>
      Path.resolve(REPO_ROOT, typeof config === 'string' ? config : Object.keys(config)[0])
    );
  });

  return [...new Set(configs)].filter((config) => Fs.existsSync(config));
};

/** Every file under a Scout root: specs, fixtures and Playwright configs. */
const findScoutFiles = (): string[] =>
  fastGlob.sync(`${TESTABLE_COMPONENT_SCOUT_ROOT_PATH_GLOB}/**/*.{ts,tsx}`, {
    cwd: REPO_ROOT,
    absolute: true,
    ignore: ['**/node_modules/**', '**/*.d.ts'],
  });

export interface CheckTestRunnerOptions {
  log: ToolingLog;
  /** Absolute paths to start from instead of every FTR config and Scout file in the repo. */
  entryPaths?: string[];
  /** Node modules to look for instead of `TEST_RUNNER_BANNED_NODE_MODULES`. */
  bannedNodeModules?: ReadonlySet<string>;
}

/** Fails when a source file loaded by FTR or Scout imports a banned node module. */
export const checkTestRunnerImportGraph = async ({
  log,
  entryPaths,
  bannedNodeModules = TEST_RUNNER_BANNED_NODE_MODULES,
}: CheckTestRunnerOptions): Promise<boolean> =>
  checkImportGraph({
    log,
    resolver: ImportResolver.create(REPO_ROOT),
    entryPaths: entryPaths ?? [...findFtrConfigs(), ...findScoutFiles()],
    bannedNodeModules,
    runtime: 'FTR and Scout',
    followTestFilePaths: true,
    fix: [
      'Fix: test code usually needs a constant, like a test subject, from a package barrel that ' +
        'also exports React components. Import it from an entry point without React or EUI, for ' +
        'example the package `test_subjects.ts`.',
    ],
  });
