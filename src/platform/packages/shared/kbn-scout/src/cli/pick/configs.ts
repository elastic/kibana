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
import { testableModules } from '@kbn/scout-reporting';
import { validateAndProcessTestFiles } from '../../common/utils';

export interface PickableConfig {
  path: string;
  module: string;
  /** Path relative to the module root */
  file: string;
  group: string;
  configSet: string;
  category: string;
  /** Local test target tags, e.g. local-stateful-classic */
  targets: string[];
  /** Whether a committed test manifest records this config's tests and their tags */
  hasManifest: boolean;
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
      module: module.name,
      file: Path.relative(module.root, config.path),
      group: module.group,
      configSet: config.server.configSet,
      category: config.category,
      targets: getLocalTargets(config.manifest.tests.flatMap(({ tags }) => tags)),
      hasManifest: config.manifest.exists,
    }))
  );

const getConfigForSpec = (spec: string): string | undefined => {
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

const findMergeBase = async () => {
  for (const ref of ['upstream/main', 'origin/main', 'main']) {
    const [base] = await git(['merge-base', 'HEAD', ref]).catch(() => []);
    if (base) return base;
  }
  return 'HEAD';
};

let mergeBase: Promise<string> | undefined;
const getMergeBase = () => (mergeBase ??= findMergeBase());

/**
 * Specs changed on this branch or not committed yet. Only specs: a page object, fixture or
 * es_archive can be imported from any module, so the specs a change to one affects cannot be
 * told from its path, and guessing from the directory it sits in would be wrong as often as
 * right.
 */
export const getChangedFiles = async (): Promise<string[]> => {
  const pathspec = ['*.spec.ts'];
  const [changed, untracked] = await Promise.all([
    getMergeBase().then((base) => git(['diff', '--name-only', base, '--', ...pathspec])),
    // `git status` finds untracked files faster than `git ls-files --others`
    git(['status', '--porcelain', '--untracked-files=all', '--', ...pathspec]).then((lines) =>
      lines.filter((line) => line.startsWith('??')).map((line) => line.slice(3))
    ),
  ]);
  return [...new Set([...changed, ...untracked])].filter((file) =>
    Fs.existsSync(Path.resolve(REPO_ROOT, file))
  );
};

/** Of a config's specs, the ones changed on this branch or not committed yet */
export const getChangedSpecs = async (specs: string[]): Promise<Set<string>> => {
  const changed = new Set(await getChangedFiles());
  return new Set(specs.filter((spec) => changed.has(spec)));
};

export interface ChangedConfig {
  config: PickableConfig;
  specs: string[];
}

export const getChangedConfigs = (files: string[], configs: PickableConfig[]): ChangedConfig[] =>
  configs.flatMap((config) => {
    const dir = `${Path.dirname(config.path)}/`;
    const specs = files.filter(
      (file) => file.startsWith(dir) && getConfigForSpec(file) === config.path
    );
    return specs.length ? [{ config, specs }] : [];
  });
