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
import type { ScoutTestTarget } from '@kbn/scout-info';
import { testTargets } from '@kbn/scout-info';
import { testableModules } from '@kbn/scout-reporting/src/registry';
import { validateAndProcessTestFiles } from '../../common/utils';

export interface PickableConfig {
  path: string;
  label: string;
  module: string;
  group: string;
  configSet: string;
  targets: ScoutTestTarget[];
}

const getLocalTargets = (tags: string[]): ScoutTestTarget[] => {
  const local = testTargets.local;
  const found = local.filter((target) => tags.includes(target.playwrightTag));
  // configs without a manifest yet, e.g. new ones, can run on any local target
  return found.length ? found : local;
};

export const getConfigs = (): PickableConfig[] =>
  testableModules.allIncludingConfigs.flatMap((module) =>
    module.configs.map((config) => ({
      path: config.path,
      label: `${module.name} · ${Path.relative(module.root, config.path)}`,
      module: module.name,
      group: module.group,
      configSet: config.server.configSet,
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

/** Spec files changed on this branch or not committed yet, grouped by their config */
export const getChangedSpecs = async (): Promise<Map<string, string[]>> => {
  const [changed, untracked] = await Promise.all([
    getMergeBase().then((base) => git(['diff', '--name-only', base, '--', '*.spec.ts'])),
    git(['ls-files', '--others', '--exclude-standard', '--', '*.spec.ts']),
  ]);

  const byConfig = new Map<string, string[]>();
  for (const spec of new Set([...changed, ...untracked])) {
    const config = Fs.existsSync(Path.resolve(REPO_ROOT, spec)) && getConfigForSpec(spec);
    if (config) {
      byConfig.set(config, [...(byConfig.get(config) ?? []), spec]);
    }
  }
  return byConfig;
};
