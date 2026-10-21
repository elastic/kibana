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
import { minimatch } from 'minimatch';
import Path from 'path';
import { parse as parseYaml } from 'yaml';
import type { EvalsSuiteMetadataEntry } from './eval_pipeline.ts';
import { getEvalSuggestions } from './evals_suggestions.ts';

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

describe('evals.suites.json coverage', () => {
  const trackedFiles = execFileSync('git', ['ls-files'], {
    cwd: Path.join(__dirname, '../../..'),
    encoding: 'utf-8',
    maxBuffer: 256 * 1024 * 1024,
  })
    .split('\n')
    .filter(Boolean);

  const suitesWithCoverage = suites.filter((suite) => suite.coverage);

  // Suites whose prompts/tools/skills have been mapped by hand. Unmapped suites never match a PR,
  // so "no mapping" must not be read as "no coverage". `smoke-tests` is left out on purpose:
  // `.github/paths-labeller.yml` already maps the eval infrastructure paths to its label.
  const SEEDED_SUITE_IDS = ['agent-builder', 'ml', 'alerting-v2', 'esql-generation'];

  it('declares coverage for every seeded suite', () => {
    const missing = SEEDED_SUITE_IDS.filter(
      (id) => !suites.find((suite) => suite.id === id)?.coverage?.include?.length
    );

    expect(missing).toEqual([]);
  });

  it('only lists include globs that match at least one tracked file', () => {
    const problems = suitesWithCoverage.flatMap(({ id, coverage }) =>
      (coverage?.include ?? [])
        .filter((glob) => !trackedFiles.some((file) => minimatch(file, glob)))
        .map((glob) => `${id}: include glob "${glob}" matches no tracked file`)
    );

    expect(problems).toEqual([]);
  });

  it('gives every suite with coverage at least one CI label to act on', () => {
    // The suggestion tells the dev to add this label; without one there is nothing to add.
    const problems = suitesWithCoverage
      .filter((suite) => !suite.ciLabels?.length)
      .map(({ id }) => `${id}: has coverage but no ciLabels`);

    expect(problems).toEqual([]);
  });

  it('has an include glob for each suite with coverage that shares its config directory', () => {
    // A change in a shared directory must not recommend every sharing suite, so such a suite is
    // only matched through the files it names itself.
    const suitesByDir = suites.reduce<Record<string, string[]>>((acc, { id, configPath }) => {
      if (!configPath) return acc;
      const dir = Path.dirname(configPath);
      return { ...acc, [dir]: [...(acc[dir] ?? []), id] };
    }, {});

    const problems = suitesWithCoverage
      .filter(({ configPath }) => configPath && suitesByDir[Path.dirname(configPath)].length > 1)
      .filter(({ coverage }) => !coverage?.include.length)
      .map(({ id }) => `${id}: shares its config directory but lists no coverage.include`);

    expect(problems).toEqual([]);
  });

  describe('shared Agent Builder eval helpers', () => {
    const SRC = 'x-pack/platform/packages/shared/agent-builder/kbn-evals-suite-agent-builder/src';
    const suggestedFor = (file: string) =>
      getEvalSuggestions({ changes: [{ filename: file }], suites, labels: [] })
        .suggestions.map(({ suiteId }) => suiteId)
        .sort();

    // The suites share one package, so these files are only mapped through explicit coverage.
    it.each([
      ['chat_client.ts', ['agent-builder', 'esql-generation']],
      ['evaluate.ts', ['agent-builder', 'esql-generation']],
      ['evaluate_dataset.ts', ['agent-builder']],
      ['ir_extractor.ts', ['agent-builder']],
    ])('recommends the suites that import %s', (file, expected) => {
      expect(suggestedFor(`${SRC}/${file}`)).toEqual(expected);
    });
  });

  describe('what the seeded coverage does and does not pick up', () => {
    const PLUGIN = 'x-pack/platform/plugins/shared/agent_builder/server';
    const GENAI =
      'x-pack/platform/packages/shared/agent-builder/agent-builder-genai-utils/tools/generate_esql';
    const suggestedFor = (file: string) =>
      getEvalSuggestions({ changes: [{ filename: file }], suites, labels: [] })
        .suggestions.map(({ suiteId }) => suiteId)
        .sort();

    it.each([
      [
        'the default agent system prompt',
        `${PLUGIN}/services/execution/run_agent/prompts/research_agent.ts`,
        ['agent-builder'],
      ],
      ['an agent definition', `${PLUGIN}/services/agents/default_ai_indices.ts`, ['agent-builder']],
      ['the generate_esql prompts', `${GENAI}/prompts.ts`, ['esql-generation']],
      [
        'a runtime generate_esql documentation file',
        `${GENAI}/documentation/syntax.md`,
        ['esql-generation'],
      ],
      [
        'the generate_esql tool wrapper',
        'x-pack/platform/plugins/shared/agent_builder_platform/server/tools/generate_esql.ts',
        ['esql-generation'],
      ],
    ])('recommends a change to %s', (_name, file, expected) => {
      expect(suggestedFor(file)).toEqual(expected);
    });

    // Model-visible code only: plumbing around the agent must stay quiet.
    it.each([
      ['an HTTP route', `${PLUGIN}/routes/internal/tools.ts`],
      ['conversation storage', `${PLUGIN}/services/conversation/client/merge_rounds.ts`],
      ['the model provider plumbing', `${PLUGIN}/services/execution/runner/model_provider.ts`],
      ['markdown outside the generate_esql documentation folder', `${GENAI}/README.md`],
    ])('stays quiet for %s', (_name, file) => {
      expect(suggestedFor(file)).toEqual([]);
    });
  });
});
