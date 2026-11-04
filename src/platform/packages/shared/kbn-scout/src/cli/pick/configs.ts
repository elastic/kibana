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
import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import { testTargets } from '@kbn/scout-info';
import { testableModules } from '@kbn/scout-reporting/src/registry';
import { validateAndProcessTestFiles } from '../../common/utils';

export interface PickableConfig {
  path: string;
  label: string;
  module: string;
  group: string;
  configSet: string;
  category: string;
  /** Local test target tags, e.g. local-stateful-classic */
  targets: string[];
}

const getLocalTargets = (tags: string[]): string[] => {
  const local = testTargets.local;
  const found = local.filter((target) => tags.includes(target.playwrightTag));
  // configs without a manifest yet, e.g. new ones, can run on any local target
  return (found.length ? found : local).map(({ tag }) => tag);
};

export const getConfigs = (): PickableConfig[] =>
  testableModules.allIncludingConfigs.flatMap((module) =>
    module.configs.map((config) => ({
      path: config.path,
      label: `${module.name} · ${Path.relative(module.root, config.path)}`,
      module: module.name,
      group: module.group,
      configSet: config.server.configSet,
      category: config.category,
      targets: getLocalTargets(config.manifest.tests.flatMap(({ tags }) => tags)),
    }))
  );

export const getConfigForSpec = (spec: string): string | undefined => {
  try {
    return validateAndProcessTestFiles(spec).configPath;
  } catch {
    return undefined;
  }
};

export const getSpecs = (configPath: string): string[] => {
  const dir = Path.resolve(REPO_ROOT, Path.dirname(configPath));
  return Fs.readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.spec.ts'))
    .map((file) => Path.relative(REPO_ROOT, Path.join(dir, file)))
    .filter((spec) => getConfigForSpec(spec) === configPath)
    .sort();
};

const git = async (args: string[]) => {
  const { stdout } = await execa('git', args, { cwd: REPO_ROOT });
  return stdout.split('\n').filter(Boolean);
};

const getMergeBase = async () => {
  for (const ref of ['upstream/main', 'origin/main', 'main']) {
    const [base] = await git(['merge-base', 'HEAD', ref]).catch(() => []);
    if (base) return base;
  }
  return 'HEAD';
};

const SCOUT_DIR = /^(.*\/test\/scout[^/]*)\//;

export interface ChangedTests {
  /** Changed specs by their config */
  specs: Map<string, string[]>;
  /** Other changed files in Scout test dirs, e.g. page objects and fixtures */
  helpers: string[];
}

/** Scout test files changed on this branch or not committed yet */
export const getChangedTests = async (): Promise<ChangedTests> => {
  const [changed, untracked] = await Promise.all([
    getMergeBase().then((base) => git(['diff', '--name-only', base, '--', '*.ts'])),
    // `git status` finds untracked files faster than `git ls-files --others`
    git(['status', '--porcelain', '--untracked-files=all', '--', '*.ts']).then((lines) =>
      lines.filter((line) => line.startsWith('??')).map((line) => line.slice(3))
    ),
  ]);

  const specs = new Map<string, string[]>();
  const helpers: string[] = [];
  for (const file of new Set([...changed, ...untracked])) {
    if (!SCOUT_DIR.test(file) || !Fs.existsSync(Path.resolve(REPO_ROOT, file))) {
      continue;
    }
    if (!file.endsWith('.spec.ts')) {
      helpers.push(file);
      continue;
    }
    const config = getConfigForSpec(file);
    if (config) {
      specs.set(config, [...(specs.get(config) ?? []), file]);
    }
  }
  return { specs, helpers };
};

/** Configs closest to a changed helper: from its own dir up to the Scout test dir */
export const getConfigsForHelper = (helper: string, configs: PickableConfig[]) => {
  const scoutDir = helper.match(SCOUT_DIR)?.[1];
  for (let dir = Path.dirname(helper); scoutDir && dir.startsWith(scoutDir); ) {
    const found = configs.filter(({ path }) => path.startsWith(`${dir}/`));
    if (found.length) {
      return found;
    }
    dir = Path.dirname(dir);
  }
  return [];
};
