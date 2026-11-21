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
import { parse as parseYaml } from 'yaml';
import type { EvalsSuiteMetadataEntry } from './eval_pipeline.ts';

// Reads the real config, unlike `eval_pipeline.test.ts` which mocks `fs` with a fixture. These
// mistakes are only reachable by hand-editing the file, so a PR-time check is the cheapest guard.
const suites = (
  JSON.parse(Fs.readFileSync(Path.join(__dirname, 'evals.suites.json'), 'utf-8')) as {
    suites: EvalsSuiteMetadataEntry[];
  }
).suites;

const TIER_FEATURE_IDS = ['alertzero_efficient', 'alertzero_balanced'];

/** Every list of steps nested under a step, per the kbn-workflows step schema. */
const nestedStepLists = (step: Record<string, any>): Array<Array<Record<string, any>>> => {
  const lists: unknown[] = [
    step.steps,
    step.else,
    step.default,
    step['on-failure']?.fallback,
    step['iteration-on-failure']?.fallback,
    ...(Array.isArray(step.cases) ? step.cases.map((branch: any) => branch?.steps) : []),
    ...(Array.isArray(step.branches) ? step.branches.map((branch: any) => branch?.steps) : []),
  ];
  return lists.filter((list): list is Array<Record<string, any>> => Array.isArray(list));
};

const asList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((id): id is string => typeof id === 'string')
    : typeof value === 'string'
    ? [value]
    : [];

/** Feature ids a step resolves its model from, in order: `with.feature_id`, then `connector-id-by-feature`; each is a string or a list. */
const stepFeatureIds = (step: Record<string, any>): string[] => [
  ...asList(step.with?.feature_id),
  ...asList(step['connector-id-by-feature']),
];

/** The first step named `name`, descending into every nested step container. */
const findStepByName = (
  steps: Array<Record<string, any>>,
  name: string
): Record<string, any> | undefined => {
  for (const step of steps) {
    if (step.name === name) return step;
    const nested = nestedStepLists(step)
      .map((list) => findStepByName(list, name))
      .find((found) => found !== undefined);
    if (nested) return nested;
  }
  return undefined;
};

/** Tier feature ids used by a step list, descending into every nested step container. */
const findTierFeatureUses = (
  steps: Array<Record<string, any>>
): Array<{ stepName: string; featureId: string }> =>
  steps.flatMap((step) => [
    ...stepFeatureIds(step)
      .filter((featureId) => TIER_FEATURE_IDS.includes(featureId))
      .map((featureId) => ({ stepName: String(step.name ?? '?'), featureId })),
    ...nestedStepLists(step).flatMap(findTierFeatureUses),
  ]);

describe('findTierFeatureUses', () => {
  const tier = (name: string) => ({
    name,
    type: 'ai.agent',
    'connector-id-by-feature': ['alertzero_balanced'],
  });

  it.each([
    ['steps', (inner: Record<string, any>) => ({ name: 'outer', steps: [inner] })],
    ['else', (inner: Record<string, any>) => ({ name: 'outer', else: [inner] })],
    ['default', (inner: Record<string, any>) => ({ name: 'outer', default: [inner] })],
    [
      'on-failure.fallback',
      (inner: Record<string, any>) => ({ name: 'outer', 'on-failure': { fallback: [inner] } }),
    ],
    [
      'iteration-on-failure.fallback',
      (inner: Record<string, any>) => ({
        name: 'outer',
        'iteration-on-failure': { fallback: [inner] },
      }),
    ],
    [
      'cases[].steps',
      (inner: Record<string, any>) => ({ name: 'outer', cases: [{ match: 1, steps: [inner] }] }),
    ],
    [
      'branches[].steps',
      (inner: Record<string, any>) => ({
        name: 'outer',
        branches: [{ name: 'a', steps: [inner] }],
      }),
    ],
  ])('finds a tier feature nested under %s', (_container, wrap) => {
    expect(findTierFeatureUses([wrap(tier('inner'))])).toEqual([
      { stepName: 'inner', featureId: 'alertzero_balanced' },
    ]);
  });

  it('finds a tier feature written as a single string', () => {
    expect(
      findTierFeatureUses([
        { name: 'one-line', type: 'ai.agent', 'connector-id-by-feature': 'alertzero_balanced' },
      ])
    ).toEqual([{ stepName: 'one-line', featureId: 'alertzero_balanced' }]);
  });

  it('reads feature_id and connector-id-by-feature on the same step', () => {
    expect(
      findTierFeatureUses([
        {
          name: 'both',
          with: { feature_id: ['alertzero_frontier'] },
          'connector-id-by-feature': ['alertzero_efficient'],
        },
      ])
    ).toEqual([{ stepName: 'both', featureId: 'alertzero_efficient' }]);
  });

  it('ignores the frontier feature', () => {
    expect(
      findTierFeatureUses([
        { name: 'ok', 'connector-id-by-feature': ['alertzero_frontier'], steps: [] },
      ])
    ).toEqual([]);
  });
});

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

describe('evals.suites.json requiredModelGroups (AZ tier coverage)', () => {
  // The Attack Discovery Worker suite must always run the AZ tier models the worker itself uses:
  // its `requiredModelGroups` is unioned into every request (PR labels and on-demand fanout), so
  // worker eval scores always cover the current tier model set. The worker resolves
  // `alertzero_template_models` then `alertzero_frontier` for generation and review, so the
  // Frontier tier is the set to cover (an unset cyber-domain row falls through to it).
  const WORKER_SUITE_ID = 'security-attack-discovery-worker';
  const workerSuite = suites.find(({ id }) => id === WORKER_SUITE_ID);
  if (!workerSuite) throw new Error(`${WORKER_SUITE_ID} is missing from evals.suites.json`);

  // `.openai-gpt-6-sol-chat_completion` -> `eis/openai-gpt-6-sol` (generate_eis_connectors.js keys
  // connectors by slugified model id; `connectorMatchesModelGroup` matches the `eis/<modelId>` form).
  const endpointToModelGroup = (endpoint: string): string | null => {
    const match = /^\.[a-z0-9.-]+-chat_completion$/.exec(endpoint);
    if (!match) return null;
    return `eis/${endpoint.slice(1, -'_chat_completion'.length)}`;
  };

  it('pins a non-empty requiredModelGroups list', () => {
    expect(workerSuite.requiredModelGroups?.length ?? 0).toBeGreaterThan(0);
  });

  it('covers every FRONTIER_RECOMMENDED_ENDPOINTS model the worker generation/review resolve to', () => {
    // The tier lists in inference_features.ts are not exported, so parse the source. Any edit to
    // the Frontier tier (a model added, swapped or dropped) must update the pin in the same PR.
    const source = Fs.readFileSync(
      Path.join(
        __dirname,
        '../../../x-pack/solutions/security/plugins/alertzero/server/inference_features.ts'
      ),
      'utf-8'
    );
    const frontierMatch = /const FRONTIER_RECOMMENDED_ENDPOINTS = \[([\s\S]*?)\];/.exec(source);
    if (!frontierMatch) {
      throw new Error('FRONTIER_RECOMMENDED_ENDPOINTS not found in inference_features.ts');
    }
    const frontierEndpoints = [...frontierMatch[1].matchAll(/'(\.[^']+)'/g)].map((m) => m[1]);
    if (frontierEndpoints.length === 0) {
      throw new Error('FRONTIER_RECOMMENDED_ENDPOINTS parsed as empty');
    }

    const pinned = new Set(workerSuite.requiredModelGroups ?? []);
    const frontierGroups = new Set<string>();
    const problems = frontierEndpoints.flatMap((endpoint) => {
      const group = endpointToModelGroup(endpoint);
      if (!group) {
        return [`could not map Frontier endpoint "${endpoint}" to an eis/ model group`];
      }
      frontierGroups.add(group);
      return pinned.has(group)
        ? []
        : [`"${group}" is Frontier but not pinned in requiredModelGroups`];
    });

    // Reverse direction: a model dropped from Frontier must leave the pin too, or it keeps running
    // in every request and fails the per-group connector assertion once EIS stops provisioning it.
    for (const group of pinned) {
      if (!frontierGroups.has(group)) {
        problems.push(`"${group}" is pinned in requiredModelGroups but not a Frontier endpoint`);
      }
    }

    expect(problems).toEqual([]);
  });

  it('stays aligned when the worker workflows change tier feature ids', () => {
    // The pin tracks what the worker actually calls. If a workflow switches tier (e.g. the FP/TP
    // review moves to balanced) or adds another tier feature, the required list must be re-reviewed.
    const DEFINITIONS = Path.join(
      __dirname,
      '../../../src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero'
    );
    const WORKER_YAMLS = [
      'attack_discovery_batched_generation.yaml',
      'attack_discovery_fp_tp_analysis.yaml',
    ];
    const problems: string[] = [];
    for (const file of WORKER_YAMLS) {
      const parsed = parseYaml(Fs.readFileSync(Path.join(DEFINITIONS, file), 'utf-8')) as {
        steps?: Array<Record<string, any>>;
        'on-failure'?: { fallback?: Array<Record<string, any>> };
      };
      const onFailureFallback = parsed['on-failure']?.fallback;
      problems.push(
        ...findTierFeatureUses([
          ...(parsed.steps ?? []),
          ...(Array.isArray(onFailureFallback) ? onFailureFallback : []),
        ]).map(
          ({ stepName, featureId }) =>
            `${file}: step "${stepName}" uses tier feature "${featureId}", which the ` +
            `requiredModelGroups pin (Frontier) does not cover. Update the pin in the same PR.`
        )
      );
    }

    expect(problems).toEqual([]);
  });
});

describe('worker model-calling steps feature chain', () => {
  const DEFINITIONS = Path.join(
    __dirname,
    '../../../src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero'
  );
  const stepsOf = (file: string): Array<Record<string, any>> =>
    (
      parseYaml(Fs.readFileSync(Path.join(DEFINITIONS, file), 'utf-8')) as {
        steps: Array<Record<string, any>>;
      }
    ).steps;

  it.each([
    ['attack_discovery_batched_generation.yaml', 'run_batch'],
    ['attack_discovery_fp_tp_analysis.yaml', 'analyze'],
  ])('%s step %s resolves template models, then Frontier', (file, stepName) => {
    const step = findStepByName(stepsOf(file), stepName);
    if (!step) throw new Error(`${file} has no step "${stepName}"`);
    expect(stepFeatureIds(step)).toEqual(['alertzero_template_models', 'alertzero_frontier']);
  });

  it('attack_discovery_batched_generation.yaml step run_batch lets an explicit connector_id input win over the feature ids', () => {
    const step = findStepByName(stepsOf('attack_discovery_batched_generation.yaml'), 'run_batch');
    if (!step) throw new Error('attack_discovery_batched_generation.yaml has no step "run_batch"');
    expect(step.with?.connector_id).toBe('{{ inputs.connector_id }}');
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
});
