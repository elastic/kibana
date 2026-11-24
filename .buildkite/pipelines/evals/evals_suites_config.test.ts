/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import Fs from 'fs';
import Path from 'path';
import { parse as parseYaml } from 'yaml';
import type { EvalsSuiteMetadataEntry } from './eval_pipeline.ts';
import { matchesDecisionPaths } from './evals_gate_rules.ts';

// Reads the real config, unlike `eval_pipeline.test.ts` which mocks `fs` with a fixture. These
// mistakes are only reachable by hand-editing the file, so a PR-time check is the cheapest guard.
const suites = (
  JSON.parse(Fs.readFileSync(Path.join(__dirname, 'evals.suites.json'), 'utf-8')) as {
    suites: EvalsSuiteMetadataEntry[];
  }
).suites;

const shardedSuites = suites.filter((suite) => (suite.shards?.length ?? 0) > 0);

// `run_suite.sh` lowercases the id and rewrites every other character to `-` to build the step key,
// so ids outside this set are not distinct from each other once keyed. Requiring the safe form up
// front keeps the id and the key identical, with no transform to reason about.
const STEP_KEY_SAFE_ID = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;

describe('evals.suites.json shards', () => {
  it('gives every shard an id that survives step-key slugification, unique within its suite', () => {
    const problems: string[] = [];

    for (const { id: suiteId, shards = [] } of shardedSuites) {
      const seen = new Set<string>();

      shards.forEach((shard, index) => {
        const shardId = shard.id?.trim();
        if (!shardId) {
          // An empty id leaves the step key unsuffixed, so two of them collide and Buildkite
          // rejects the whole fanout upload.
          problems.push(`${suiteId}: shard at index ${index} has no id`);
          return;
        }
        if (!STEP_KEY_SAFE_ID.test(shardId)) {
          // e.g. `feature/a` and `feature-a` both key as `feature-a`, colliding the step keys and
          // merging the two shards' failure-log metadata.
          problems.push(`${suiteId}: shard id "${shardId}" is not lowercase [a-z0-9_-]`);
        }
        if (seen.has(shardId)) {
          problems.push(`${suiteId}: duplicate shard id "${shardId}"`);
        }
        seen.add(shardId);
      });
    }

    expect(problems).toEqual([]);
  });

  it('gives every shard at least one spec file to run', () => {
    const problems = shardedSuites.flatMap(({ id: suiteId, shards = [] }) =>
      shards
        // A shard with no spec files runs the whole suite, overlapping every other shard.
        .filter((shard) => !shard.specFiles?.length)
        .map((shard) => `${suiteId}: shard "${shard.id}" lists no specFiles`)
    );

    expect(problems).toEqual([]);
  });

  it('keeps spec file paths safe to interpolate into the fanout pipeline', () => {
    // The paths are space-joined into one env var and re-split by the fanout step, then written
    // into a double-quoted YAML scalar that Buildkite interpolates. Whitespace would split one path
    // into two; `\` and `"` would break the scalar; `$` would be substituted away.
    const problems = shardedSuites.flatMap(({ id: suiteId, shards = [] }) =>
      shards.flatMap((shard) =>
        (shard.specFiles ?? [])
          .filter((specFile) => !/^[\w./-]+\.spec\.ts$/.test(specFile))
          .map((specFile) => `${suiteId}: shard "${shard.id}" has unsafe specFile "${specFile}"`)
      )
    );

    expect(problems).toEqual([]);
  });

  it('never lists the same spec file in two shards of a suite', () => {
    const problems = shardedSuites.flatMap(({ id: suiteId, shards = [] }) => {
      const owners = new Map<string, string[]>();

      for (const shard of shards) {
        for (const specFile of shard.specFiles ?? []) {
          owners.set(specFile, [...(owners.get(specFile) ?? []), shard.id]);
        }
      }

      return [...owners]
        .filter(([, shardIds]) => shardIds.length > 1)
        .map(([specFile, shardIds]) => `${suiteId}: "${specFile}" is in [${shardIds.join(', ')}]`);
    });

    expect(problems).toEqual([]);
  });
});

describe('evals.suites.json Scout arch/domain', () => {
  it('only uses arches run_suite.sh and the evals CLI support, with a domain for serverless', () => {
    const problems = suites.flatMap(({ id, scoutArch, scoutDomain }) => {
      if (scoutArch === undefined) return [];
      if (scoutArch !== 'stateful' && scoutArch !== 'serverless') {
        return [`${id}: scoutArch "${scoutArch}" is not stateful or serverless`];
      }
      // `node scripts/evals start` refuses a serverless suite without a domain; catch it at PR time.
      if (scoutArch === 'serverless' && !scoutDomain) {
        return [`${id}: scoutArch "serverless" has no scoutDomain`];
      }
      return [];
    });

    expect(problems).toEqual([]);
  });
});

interface WeeklyStep {
  env?: Record<string, string | undefined>;
  steps?: WeeklyStep[];
}

// `[suiteId, requested model groups]` for every suite step in llm_evals.yml, including those
// nested in groups.
const weeklySuiteModelGroups = (steps: WeeklyStep[]): Array<[string, Set<string>]> =>
  steps.flatMap(({ env = {}, steps: nested = [] }) => [
    ...(env.EVAL_SUITE_ID
      ? [
          [
            env.EVAL_SUITE_ID,
            new Set((env.EVAL_MODEL_GROUPS ?? '').split(',').filter(Boolean)),
          ] as [string, Set<string>],
        ]
      : []),
    ...weeklySuiteModelGroups(nested),
  ]);

const weeklyModelGroupsBySuite = new Map(
  weeklySuiteModelGroups(
    (parseYaml(Fs.readFileSync(Path.join(__dirname, 'llm_evals.yml'), 'utf-8')) as WeeklyStep)
      .steps ?? []
  )
);

describe('evals.suites.json weeklyEisModelGroups', () => {
  it('is covered by the EVAL_MODEL_GROUPS of the suite step in llm_evals.yml', () => {
    // The weekly job requests EVAL_MODEL_GROUPS, not weeklyEisModelGroups, so a model present only
    // in evals.suites.json is provisioned but never gets a step. Fail on the PR that drifts.
    const problems = suites
      .filter((suite) => (suite.weeklyEisModelGroups?.length ?? 0) > 0)
      .flatMap(({ id, weeklyEisModelGroups = [] }) => {
        const requested = weeklyModelGroupsBySuite.get(id);
        if (!requested) {
          return [`${id}: has weeklyEisModelGroups but no step in llm_evals.yml`];
        }
        return weeklyEisModelGroups
          .filter((model) => !requested.has(model))
          .map((model) => `${id}: "${model}" is in weeklyEisModelGroups but not in llm_evals.yml`);
      });

    expect(problems).toEqual([]);
  });
});

describe('evals.suites.json evals decision', () => {
  const decisionSuites = suites.filter((suite) => suite.requireDecisionOnPaths !== undefined);
  const gatedSuites = suites.filter((suite) => suite.regressionGate !== undefined);

  let trackedFilesCache: string[] | undefined;
  const getTrackedFiles = (): string[] => {
    trackedFilesCache ??=
      decisionSuites.length > 0
        ? execFileSync('git', ['ls-files'], {
            cwd: Path.resolve(__dirname, '../../..'),
            encoding: 'utf-8',
            maxBuffer: 256 * 1024 * 1024,
          }).split('\n')
        : [];
    return trackedFilesCache;
  };

  it('only requires a decision for files that run CI', () => {
    // A PR changing only CI-skippable files (e.g. `.md`) never reaches the eval trigger, so a gated
    // run label on it would wait forever. Such files must be excluded from the decision paths.
    const prPipeline = (
      JSON.parse(Fs.readFileSync(Path.join(__dirname, '../../pull_requests.json'), 'utf-8')) as {
        jobs: Array<{ pipelineSlug: string; skip_ci_on_only_changed?: string[] }>;
      }
    ).jobs.find(({ pipelineSlug }) => pipelineSlug === 'kibana-pull-request');
    const skippable = (prPipeline?.skip_ci_on_only_changed ?? []).map((re) => new RegExp(re, 'i'));

    const problems = decisionSuites.flatMap(({ id, requireDecisionOnPaths }) =>
      getTrackedFiles()
        .filter(
          (file) =>
            requireDecisionOnPaths !== undefined &&
            matchesDecisionPaths(file, requireDecisionOnPaths) &&
            skippable.some((re) => re.test(file))
        )
        .map((file) => `${id}: ${file} requires a decision but doesn't run CI`)
    );

    expect(problems).toEqual([]);
  });

  it('never hides a prompt behind a folder-specific exclude', () => {
    // Suites include whole plugins and exclude the folders that don't change agent behaviour, so a
    // new folder is gated by default. An exclude naming a folder (unlike `**/*.test.ts`-style
    // file-kind rules) is the one way a prompt can slip out, so it must not cover any prompt file.
    const isPromptFile = (file: string): boolean =>
      file.endsWith('.text') ||
      /prompt/i.test(Path.basename(file)) ||
      file.includes('/instructions/');

    const problems = decisionSuites.flatMap(({ id, requireDecisionOnPaths }) => {
      const { include = [], exclude = [] } = requireDecisionOnPaths ?? {};
      const folderExcludes = exclude.filter((glob) => !glob.startsWith('**/'));
      return getTrackedFiles()
        .filter(
          (file) => isPromptFile(file) && include.some((glob) => Path.matchesGlob(file, glob))
        )
        .flatMap((file) =>
          folderExcludes
            .filter((glob) => Path.matchesGlob(file, glob))
            .map((glob) => `${id}: exclude "${glob}" hides the prompt file ${file}`)
        );
    });

    expect(problems).toEqual([]);
  });

  it('lists include globs that each match a tracked file', () => {
    // A glob that matches nothing (e.g. after a directory move) silently stops requiring a decision.
    const trackedFiles = getTrackedFiles();

    const problems = decisionSuites.flatMap(({ id, requireDecisionOnPaths }) => {
      const { include = [], exclude = [] } = requireDecisionOnPaths ?? {};
      if (include.length === 0) {
        return [`${id}: requireDecisionOnPaths has no include globs`];
      }
      return [
        ...[...include, ...exclude]
          .filter((glob) => typeof glob !== 'string' || glob.trim() === '')
          .map(() => `${id}: requireDecisionOnPaths has an empty glob`),
        ...include
          .filter((glob) => {
            // Narrow to the glob's literal prefix first; a full scan per glob is seconds slow.
            const prefix = glob.split(/[*?{[]/)[0];
            return !trackedFiles.some(
              (file) => file.startsWith(prefix) && Path.matchesGlob(file, glob)
            );
          })
          .map((glob) => `${id}: include glob "${glob}" matches no tracked file`),
      ];
    });

    expect(problems).toEqual([]);
  });

  it('gives every suite that requires a decision a default model', () => {
    // Without one, the run label satisfies the gate but selects nothing to run.
    const problems = decisionSuites
      .filter(({ defaultModelGroups }) => !defaultModelGroups?.length)
      .map(({ id }) => `${id}: requireDecisionOnPaths needs defaultModelGroups`);

    expect(problems).toEqual([]);
  });

  it('gives every regression gate a default model, decision paths and sane thresholds', () => {
    const problems = gatedSuites.flatMap(
      ({ id, regressionGate, defaultModelGroups, requireDecisionOnPaths }) => {
        if (!regressionGate) return [];
        const { dataset, evaluator, alpha, minAbsoluteDrop, maxBaselineAgeDays } = regressionGate;
        return [
          // The verdict is computed for the default model, so the gate needs one to run.
          ...(defaultModelGroups?.length ? [] : [`${id}: regressionGate needs defaultModelGroups`]),
          // The gate only checks suites whose decision paths a PR touches.
          ...(requireDecisionOnPaths ? [] : [`${id}: regressionGate needs requireDecisionOnPaths`]),
          ...(dataset?.trim() ? [] : [`${id}: regressionGate.dataset is empty`]),
          ...(evaluator?.trim() ? [] : [`${id}: regressionGate.evaluator is empty`]),
          ...(alpha > 0 && alpha < 1 ? [] : [`${id}: regressionGate.alpha must be in (0, 1)`]),
          ...(minAbsoluteDrop > 0 && minAbsoluteDrop <= 1
            ? []
            : [`${id}: regressionGate.minAbsoluteDrop must be in (0, 1]`]),
          ...(Number.isInteger(maxBaselineAgeDays) && maxBaselineAgeDays > 0
            ? []
            : [`${id}: regressionGate.maxBaselineAgeDays must be a positive integer`]),
        ];
      }
    );

    expect(problems).toEqual([]);
  });
});

describe('Nightshift CI coverage', () => {
  it('runs the Customer-0 stored datasets alongside isolated ORCA and reinforcement specs', () => {
    const suite = suites.find(({ id }) => id === 'nightshift-investigations');
    expect(suite?.ciLabels).toEqual(['evals:nightshift-investigations']);
    expect(suite?.shards?.map(({ id }) => id)).toEqual([
      'customer0-golden',
      'customer0-connector-probes',
      'orcabench',
      'reinforcement',
    ]);
    const files = suite?.shards?.flatMap(({ specFiles }) => specFiles) ?? [];
    expect(files).toEqual([
      'evals/investigation/stored.spec.ts',
      'evals/connector_probe/stored.spec.ts',
      'evals/investigation/orcabench.spec.ts',
      'evals/reinforcement/reinforcement.spec.ts',
    ]);
    const configPath = suite?.configPath;
    expect(configPath).toBeDefined();
    if (!configPath) throw new Error('Nightshift config is missing');
    const suiteRoot = Path.dirname(Path.resolve(__dirname, '../../..', configPath));
    for (const file of files) expect(Fs.existsSync(Path.join(suiteRoot, file))).toBe(true);
  });

  it('gates golden goal_pass for the production model, the one the daily run baselines', () => {
    const suite = suites.find(({ id }) => id === 'nightshift-investigations');
    // daily_evals.yml runs Sonnet 5.5 on main; the gate compares against that baseline.
    expect(suite?.defaultModelGroups).toEqual(['eis/anthropic-claude-5.5-sonnet']);
    expect(suite?.regressionGate).toEqual({
      dataset: 'ns-investigation-golden-2710',
      evaluator: 'goal_pass',
      minAbsoluteDrop: 0.1,
      alpha: 0.05,
      maxBaselineAgeDays: 3,
    });
  });
});
