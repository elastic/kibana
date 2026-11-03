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

import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { getMoonBinPath } from './strategy_moon.ts';
import { getKibanaDir } from '../get_kibana_dir.ts';

interface MoonTask {
  args: string[];
}

interface MoonTaskQuery {
  tasks: Record<string, Record<string, MoonTask>>;
}

interface MoonProjectQuery {
  projects: Array<{ id: string; source: string }>;
}

export interface MoonTestSelection {
  modeledConfigs: ReadonlySet<string>;
  affectedConfigs: ReadonlySet<string>;
}

export type MoonJestUnitSelection = MoonTestSelection;
export type MoonTestTag = 'jest-unit-tests' | 'jest-integration-tests' | 'scout-tests';

const kindByTag = {
  'jest-unit-tests': 'jest-unit',
  'jest-integration-tests': 'jest-integration',
  'scout-tests': 'scout',
} as const;

const taskIdByTag = {
  'jest-unit-tests': 'jest',
  'jest-integration-tests': 'jestIntegrationConfigs',
  'scout-tests': 'scoutConfigs',
} as const;

const taskConfigs = ({ tasks }: MoonTaskQuery, tag: MoonTestTag): Map<string, string[]> =>
  new Map(
    Object.entries(tasks).map(([project, projectTasks]): [string, string[]] => {
      const task = projectTasks[taskIdByTag[tag]];
      if (!task) throw new Error(`Moon project ${project} has no ${taskIdByTag[tag]} task`);
      if (tag !== 'jest-unit-tests') return [project, task.args];

      const separator = task.args.indexOf('--');
      if (separator < 1) throw new Error(`Moon project ${project} has no Jest config separator`);
      return [project, task.args.slice(1, separator)];
    })
  );

/** Returns config paths from Moon's inherited, per-project test tasks. */
export const queryMoonTestSelection = (
  changedFiles: string[],
  tag: MoonTestTag
): MoonTestSelection => {
  const cwd = getKibanaDir();
  const moon = getMoonBinPath();
  const query = (args: string[], input?: string): MoonTaskQuery =>
    JSON.parse(
      execFileSync(moon, ['query', 'tasks', '--tags', `^${tag}$`, ...args], {
        cwd,
        encoding: 'utf8',
        input,
        maxBuffer: 30 * 1024 * 1024,
        timeout: 120_000,
      })
    ) as MoonTaskQuery;

  const modeled = taskConfigs(query([]), tag);
  const affected = taskConfigs(
    query(['--affected', '--downstream', 'deep'], JSON.stringify({ files: changedFiles })),
    tag
  );
  const projectQuery = JSON.parse(
    execFileSync(moon, ['query', 'projects'], {
      cwd,
      encoding: 'utf8',
      maxBuffer: 30 * 1024 * 1024,
      timeout: 120_000,
    })
  ) as MoonProjectQuery;
  const sources = new Map(projectQuery.projects.map(({ id, source }) => [id, source]));
  const projects = [...affected].map(([id, configs]) => {
    const sourceRoot = sources.get(id);
    if (!sourceRoot) throw new Error(`Moon project ${id} has no source root`);
    return { sourceRoot, configs };
  });
  const selected = JSON.parse(
    execFileSync(process.execPath, [path.join(cwd, 'scripts/moon_test_configs.js')], {
      cwd,
      encoding: 'utf8',
      input: JSON.stringify({ projects, changedFiles, kind: kindByTag[tag] }),
      maxBuffer: 30 * 1024 * 1024,
      timeout: 120_000,
    })
  ) as string[];

  return {
    modeledConfigs: new Set([...modeled.values()].flat()),
    affectedConfigs: new Set(selected),
  };
};

export const queryMoonJestUnitSelection = (changedFiles: string[]): MoonTestSelection =>
  queryMoonTestSelection(changedFiles, 'jest-unit-tests');
