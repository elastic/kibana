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

export type MoonTestTag = 'jest-unit-tests' | 'jest-integration-tests' | 'scout-tests';

const taskIdByTag = {
  'jest-unit-tests': 'jest',
  'jest-integration-tests': 'jestIntegrationConfigs',
  'scout-tests': 'scoutConfigs',
} as const;

const tagPattern = (tags: readonly MoonTestTag[]): string => `^(${tags.join('|')})$`;

const taskConfigs = ({ tasks }: MoonTaskQuery, tag: MoonTestTag): Map<string, string[]> => {
  const configsByProject = new Map<string, string[]>();
  for (const [project, projectTasks] of Object.entries(tasks)) {
    const task = projectTasks[taskIdByTag[tag]];
    // A combined tag query also returns projects that only carry the other tags.
    if (!task) continue;
    if (tag !== 'jest-unit-tests') {
      configsByProject.set(project, task.args);
      continue;
    }

    const separator = task.args.indexOf('--');
    if (separator < 1) throw new Error(`Moon project ${project} has no Jest config separator`);
    configsByProject.set(project, task.args.slice(1, separator));
  }
  return configsByProject;
};

/** Returns config paths from Moon's inherited, per-project test tasks, one query for all tags. */
export const queryMoonTestSelections = (
  changedFiles: string[],
  tags: readonly MoonTestTag[]
): Map<MoonTestTag, MoonTestSelection> => {
  const cwd = getKibanaDir();
  const moon = getMoonBinPath();
  const exec = <T>(args: string[], input?: string): T =>
    JSON.parse(
      execFileSync(moon, args, {
        cwd,
        encoding: 'utf8',
        input,
        maxBuffer: 30 * 1024 * 1024,
        timeout: 120_000,
      })
    ) as T;
  const queryTasks = (args: string[], input?: string): MoonTaskQuery =>
    exec(['query', 'tasks', '--tags', tagPattern(tags), ...args], input);

  const modeled = queryTasks([]);
  const affected = queryTasks(
    ['--affected', '--downstream', 'deep'],
    JSON.stringify({ files: changedFiles })
  );

  let sources: Map<string, string> | undefined;
  const getSources = (): Map<string, string> => {
    sources ??= new Map(
      exec<MoonProjectQuery>(['query', 'projects']).projects.map(({ id, source }) => [id, source])
    );
    return sources;
  };

  const selections = new Map<MoonTestTag, MoonTestSelection>();
  for (const tag of tags) {
    const affectedByProject = taskConfigs(affected, tag);
    selections.set(tag, {
      modeledConfigs: new Set([...taskConfigs(modeled, tag).values()].flat()),
      // Jest selects every config of an affected project; only Scout narrows by changed file.
      affectedConfigs: new Set(
        tag === 'scout-tests'
          ? selectScoutConfigs(cwd, affectedByProject, getSources(), changedFiles)
          : [...affectedByProject.values()].flat()
      ),
    });
  }
  return selections;
};

const selectScoutConfigs = (
  cwd: string,
  affectedByProject: Map<string, string[]>,
  sources: Map<string, string>,
  changedFiles: string[]
): string[] => {
  const projects = [...affectedByProject].map(([id, configs]) => {
    const sourceRoot = sources.get(id);
    if (!sourceRoot) throw new Error(`Moon project ${id} has no source root`);
    return { sourceRoot, configs };
  });
  return JSON.parse(
    execFileSync(process.execPath, [path.join(cwd, 'scripts/moon_test_configs.js')], {
      cwd,
      encoding: 'utf8',
      input: JSON.stringify({ projects, changedFiles, kind: 'scout' }),
      maxBuffer: 30 * 1024 * 1024,
      timeout: 120_000,
    })
  ) as string[];
};

/** Returns config paths from Moon's inherited, per-project test tasks for one tag. */
export const queryMoonTestSelection = (
  changedFiles: string[],
  tag: MoonTestTag
): MoonTestSelection => {
  const selection = queryMoonTestSelections(changedFiles, [tag]).get(tag);
  if (!selection) throw new Error(`Moon returned no selection for ${tag}`);
  return selection;
};
