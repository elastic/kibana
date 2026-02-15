/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';

import Os from 'os';
import execa from 'execa';
import { run } from '@kbn/dev-cli-runner';
import type { RunOptions } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import { getRepoFiles } from '@kbn/get-repo-files';
import type { RepoPath } from '@kbn/repo-path';
import { REPO_ROOT } from '@kbn/repo-info';
import { makeMatcher } from '@kbn/picomatcher';
import { TS_PROJECTS, type TsProject } from '@kbn/ts-projects';

const ESLINT_EXTENSIONS = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts']);

const JEST_CONFIG_PATTERN = /jest(\.integration)?\.config(\.[^/]+)?\.js$/;
const JEST_CONFIG_GLOBS = [
  '**/jest.config.js',
  '**/jest.integration.config.js',
  '**/jest.integration.config.*.js',
];

export interface JestConfigEntry {
  absPath: string;
  repoRel: string;
  dir: string;
  type: 'unit' | 'integration';
}

export interface JestRunTarget {
  config: JestConfigEntry;
  files: Set<string>;
  fullRun: boolean;
}

export interface CommandTask {
  command: string;
  args: string[];
  label: string;
}

interface RunPlan {
  lintFiles: string[];
  jestTargets: JestRunTarget[];
  typeCheckProjects: TsProject[];
}

export interface JestPolicy {
  testEnvironmentOptions?: string;
  passWithNoTests: boolean;
}

interface JestConcurrency {
  maxParallel: number;
  budget: number;
  workersPerConfig: number;
}

interface ProjectMatcher {
  project: TsProject;
  filesSet: Set<string> | null;
  localMatcher?: (path: string) => boolean;
  externalMatcher?: (path: string) => boolean;
}

const getChangedFiles = async (): Promise<RepoPath[]> => {
  const [{ stdout: diff }, { stdout: untracked }] = await Promise.all([
    execa('git', ['diff', '--name-only', '--diff-filter=AMR', 'HEAD'], {
      cwd: REPO_ROOT,
    }),
    execa('git', ['ls-files', '--others', '--exclude-standard'], {
      cwd: REPO_ROOT,
    }),
  ]);

  const files = new Set(
    [...diff.split('\n'), ...untracked.split('\n')].map((file) => file.trim()).filter(Boolean)
  );

  if (files.size === 0) {
    return [];
  }

  const repoRels = Array.from(files);
  const repoFiles = await getRepoFiles(repoRels.map((file) => Path.resolve(REPO_ROOT, file)));
  const repoFilesByRel = new Map(repoFiles.map((file) => [file.repoRel, file]));

  return repoRels
    .map((repoRel) => repoFilesByRel.get(repoRel))
    .filter((file): file is RepoPath => Boolean(file));
};

const runCommand = async (
  log: ToolingLog,
  command: string,
  args: string[],
  label: string
): Promise<boolean> => {
  log.info(label);
  const { exitCode, signal } = await execa(command, args, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    reject: false,
  });

  const failed = exitCode !== 0 || Boolean(signal);

  if (failed) {
    log.error(`${label} failed${signal ? ` (signal: ${signal})` : ''}`);
    return false;
  }

  return true;
};

const isLintableFile = (file: RepoPath): boolean => ESLINT_EXTENSIONS.has(file.ext);

const getLintFiles = (changedFiles: RepoPath[]): string[] =>
  changedFiles.filter(isLintableFile).map((file) => file.repoRel);

const runCommandTasks = async (
  log: ToolingLog,
  tasks: CommandTask[],
  maxParallel: number
): Promise<boolean> => {
  if (tasks.length === 0) {
    return true;
  }

  let success = true;
  let active = 0;
  let index = 0;

  return await new Promise<boolean>((resolve) => {
    const launchNext = () => {
      while (active < maxParallel && index < tasks.length) {
        const task = tasks[index++];
        active += 1;
        runCommand(log, task.command, task.args, task.label)
          .then((ok) => {
            success = success && ok;
          })
          .finally(() => {
            active -= 1;
            if (index >= tasks.length && active === 0) {
              resolve(success);
            } else {
              launchNext();
            }
          });
      }
    };

    launchNext();
  });
};

const runEslintFix = async (log: ToolingLog, lintFiles: string[]): Promise<boolean> => {
  if (lintFiles.length === 0) {
    log.info('Skipping ESLint: no JS/TS files changed.');
    return true;
  }

  return runCommand(
    log,
    process.execPath,
    ['--no-experimental-require-module', 'scripts/eslint', '--fix', ...lintFiles],
    `Running ESLint --fix on ${lintFiles.length} file(s)...`
  );
};

const getJestConfigEntries = async (changedFiles: string[]): Promise<JestConfigEntry[]> => {
  const { stdout } = await execa('git', ['ls-files', '--', ...JEST_CONFIG_GLOBS], {
    cwd: REPO_ROOT,
  });

  const configFiles = new Set(
    stdout
      .split('\n')
      .map((file) => file.trim())
      .filter(Boolean)
  );

  for (const file of changedFiles) {
    if (JEST_CONFIG_PATTERN.test(file)) {
      configFiles.add(file);
    }
  }

  return Array.from(configFiles)
    .filter((file) => Fs.existsSync(Path.resolve(REPO_ROOT, file)))
    .map((file) => {
      const absPath = Path.resolve(REPO_ROOT, file);
      const type = file.includes('jest.integration.config') ? 'integration' : 'unit';
      return {
        absPath,
        repoRel: Path.relative(REPO_ROOT, absPath),
        dir: Path.dirname(absPath),
        type,
      };
    });
};

export const getJestRunTargets = (
  changedFiles: string[],
  configs: JestConfigEntry[]
): JestRunTarget[] => {
  const configsByDir = new Map<string, JestConfigEntry[]>();
  for (const config of configs) {
    const current = configsByDir.get(config.dir);
    if (current) {
      current.push(config);
    } else {
      configsByDir.set(config.dir, [config]);
    }
  }

  const targetsByConfig = new Map<string, JestRunTarget>();

  for (const file of changedFiles) {
    const absFile = Path.resolve(REPO_ROOT, file);
    let dir = Path.dirname(absFile);
    let matchedConfigs: JestConfigEntry[] | undefined;

    while (true) {
      matchedConfigs = configsByDir.get(dir);
      if (matchedConfigs) {
        break;
      }
      if (dir === REPO_ROOT) {
        break;
      }
      dir = Path.dirname(dir);
    }

    if (!matchedConfigs) {
      continue;
    }

    for (const config of matchedConfigs) {
      let target = targetsByConfig.get(config.absPath);
      if (!target) {
        target = { config, files: new Set<string>(), fullRun: false };
        targetsByConfig.set(config.absPath, target);
      }
      target.files.add(file);
      if (file === config.repoRel) {
        target.fullRun = true;
      }
    }
  }

  return Array.from(targetsByConfig.values()).sort((a, b) =>
    a.config.repoRel.localeCompare(b.config.repoRel)
  );
};

const getJestPolicy = (): JestPolicy => {
  const nodeMajor = Number(process.versions.node.split('.')[0] ?? 0);
  return {
    testEnvironmentOptions: nodeMajor >= 22 ? JSON.stringify({ globalsCleanup: 'off' }) : undefined,
    passWithNoTests: true,
  };
};

const getJestConcurrency = (): JestConcurrency => {
  const cpuCount = Math.max(Os.availableParallelism?.() ?? Os.cpus().length, 1);
  const maxParallelRaw = process.env.LLM_JEST_MAX_PARALLEL ?? process.env.JEST_MAX_PARALLEL ?? '';
  const maxParallel = Math.max(
    1,
    Number.isFinite(Number(maxParallelRaw)) && Number(maxParallelRaw) > 0
      ? Number(maxParallelRaw)
      : Math.max(cpuCount - 1, 1)
  );

  // Keep some headroom so multiple Jest processes don't saturate the machine.
  const budget = Math.max(cpuCount - 1, 1);
  const workersPerConfig = Math.max(1, Math.floor(budget / maxParallel));

  return {
    maxParallel,
    budget,
    workersPerConfig,
  };
};

export const buildJestTask = (
  target: JestRunTarget,
  workersPerConfig: number,
  policy: JestPolicy
): CommandTask => {
  const configPath = target.config.repoRel;
  const files = Array.from(target.files).sort();
  const useFindRelated = !target.fullRun && files.length > 0;
  const script = target.config.type === 'integration' ? 'scripts/jest_integration' : 'scripts/jest';
  const args = ['--no-experimental-require-module', script, '--config', configPath];

  if (policy.testEnvironmentOptions) {
    args.push('--testEnvironmentOptions', policy.testEnvironmentOptions);
  }

  // Integration configs already force --runInBand via scripts/jest_integration.
  if (target.config.type === 'unit') {
    if (workersPerConfig === 1) {
      args.push('--runInBand');
    } else {
      args.push('--maxWorkers', String(workersPerConfig));
    }
  }

  if (useFindRelated) {
    args.push('--findRelatedTests', ...files);
    if (policy.passWithNoTests) {
      args.push('--passWithNoTests');
    }
  }

  const label = useFindRelated
    ? `Running Jest for ${configPath} (findRelatedTests)...`
    : `Running Jest for ${configPath}...`;

  return {
    command: process.execPath,
    args,
    label,
  };
};

const runJest = async (log: ToolingLog, targets: JestRunTarget[]): Promise<boolean> => {
  if (targets.length === 0) {
    log.info('Skipping Jest: no configs matched changed files.');
    return true;
  }

  const policy = getJestPolicy();
  const { maxParallel, budget, workersPerConfig } = getJestConcurrency();

  log.info(
    `Running ${targets.length} Jest config(s) with maxParallel=${maxParallel}, budget=${budget}, workersPerConfig=${workersPerConfig}.`
  );

  const tasks = targets.map((target) => buildJestTask(target, workersPerConfig, policy));

  return await runCommandTasks(log, tasks, maxParallel);
};

const buildProjectMatchers = (): ProjectMatcher[] => {
  const isNotLocal = (pattern: string) => pattern.startsWith('..');
  const isLocal = (pattern: string) => !isNotLocal(pattern);
  const toStringArray = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

  return TS_PROJECTS.filter((project) => !project.isTypeCheckDisabled()).map((project) => {
    const include = toStringArray(project.config.include);
    const exclude = toStringArray(project.config.exclude);
    const files = toStringArray(project.config.files);

    const effectiveInclude = include.length === 0 && files.length === 0 ? ['**/*'] : include;

    const filesSet =
      files.length > 0
        ? new Set(
            files.map((file) => {
              const abs = Path.resolve(project.directory, file);
              return Path.relative(REPO_ROOT, abs);
            })
          )
        : null;

    const toRepoRel = (pattern: string) =>
      Path.relative(REPO_ROOT, Path.resolve(project.directory, pattern));
    const toRepoRelExcl = (pattern: string) => `!${toRepoRel(pattern)}`;

    const localPatterns = project.pkg
      ? [
          ...effectiveInclude.filter(isLocal).map(toRepoRel),
          ...exclude.filter(isLocal).map(toRepoRelExcl),
        ]
      : [];

    const externalPatterns = project.pkg
      ? [
          ...effectiveInclude.filter(isNotLocal).map(toRepoRel),
          ...exclude.filter(isNotLocal).map(toRepoRelExcl),
        ]
      : [...effectiveInclude.map(toRepoRel), ...exclude.map(toRepoRelExcl)];

    return {
      project,
      filesSet,
      localMatcher: localPatterns.length ? makeMatcher(localPatterns) : undefined,
      externalMatcher: externalPatterns.length ? makeMatcher(externalPatterns) : undefined,
    };
  });
};

const matchesProject = (file: string, matcher: ProjectMatcher): boolean => {
  if (matcher.filesSet?.has(file)) {
    return true;
  }
  if (matcher.localMatcher && matcher.localMatcher(file)) {
    return true;
  }
  if (matcher.externalMatcher && matcher.externalMatcher(file)) {
    return true;
  }
  return false;
};

const findTypeCheckProjects = (changedFiles: string[]): TsProject[] => {
  const matchers = buildProjectMatchers();
  const projects = new Set<TsProject>();

  for (const file of changedFiles) {
    for (const matcher of matchers) {
      if (file === matcher.project.repoRel || matchesProject(file, matcher)) {
        projects.add(matcher.project);
      }
    }
  }

  return Array.from(projects).sort((a, b) => a.repoRel.localeCompare(b.repoRel));
};

const runTypeCheck = async (log: ToolingLog, projects: TsProject[]): Promise<boolean> => {
  if (projects.length === 0) {
    log.info('Skipping type check: no TS projects matched changed files.');
    return true;
  }

  let success = true;

  for (const project of projects) {
    const ok = await runCommand(
      log,
      process.execPath,
      ['--no-experimental-require-module', 'scripts/type_check', '--project', project.repoRel],
      `Running type check for ${project.repoRel}...`
    );
    success = success && ok;
  }

  return success;
};

const buildRunPlan = async (changedFiles: RepoPath[]): Promise<RunPlan> => {
  const changedRepoRels = changedFiles.map((file) => file.repoRel);
  const lintFiles = getLintFiles(changedFiles);
  const jestConfigs = await getJestConfigEntries(changedRepoRels);
  const jestTargets = getJestRunTargets(changedRepoRels, jestConfigs);
  const typeCheckProjects = findTypeCheckProjects(changedRepoRels);

  return {
    lintFiles,
    jestTargets,
    typeCheckProjects,
  };
};

const runPlannedChecks = async (log: ToolingLog, plan: RunPlan): Promise<boolean> => {
  const lintOk = await runEslintFix(log, plan.lintFiles);

  const [jestOk, typeCheckOk] = await Promise.all([
    runJest(log, plan.jestTargets),
    runTypeCheck(log, plan.typeCheckProjects),
  ]);

  return lintOk && jestOk && typeCheckOk;
};

const scriptOptions: RunOptions = {
  description: `
    Run quick LLM checks on changed files:
      - ESLint --fix for changed JS/TS files
      - Jest for configs containing changed files
      - Type check for TS projects containing changed files
  `,
  log: {
    context: 'llm',
  },
};

run(async ({ log }) => {
  const changedFiles = await getChangedFiles();

  if (changedFiles.length === 0) {
    log.info('No changed files detected.');
    return;
  }

  log.info(`Detected ${changedFiles.length} changed file(s).`);

  const plan = await buildRunPlan(changedFiles);
  const success = await runPlannedChecks(log, plan);

  if (!success) {
    process.exitCode = 1;
  }
}, scriptOptions);
