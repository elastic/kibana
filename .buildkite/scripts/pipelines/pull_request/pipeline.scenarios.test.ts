/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Runs the whole pull_request pipeline for example PRs and snapshots the ordered step ids it
// emits. The scenarios guard which fragments are selected and in what order, so a change to the
// trigger logic or to how fragments are rendered shows up here. Step bodies are covered by the
// fragment snapshots in `pipeline-utils/step-library`.
//
// The mock harness is copied from `pipeline.test.ts`: `jest.mock` factories have to live in the
// test file that uses them.

import { parse as yamlLoad } from 'yaml';
import { doAnyChangesMatch as realDoAnyChangesMatch } from '../../../pipeline-utils/github/github.ts';
import { FIPS_GH_LABELS, FIPS_VERSION } from '#pipeline-utils/pr_labels';
import { getKibanaDir } from '#pipeline-utils/utils';

process.chdir(getKibanaDir());
const mockAreChangesSkippable = jest.fn();
const mockDoAnyChangesMatch = jest.fn();
const mockDoAllChangesMatch = jest.fn();
const mockGetAgentImageConfig = jest.fn();
const mockFlushCancelOnGateFailureMetadata = jest.fn();
const mockRunPreBuild = jest.fn();
const mockGetEvalTriggerStep = jest.fn();
const mockIsAutomatedVersionBumpPR = jest.fn();
const mockGetPrChangesCached = jest.fn();
const mockGetAffectedPackages = jest.fn();

jest.mock('#pipeline-utils', () => {
  const actual = jest.requireActual('#pipeline-utils');
  return {
    ...actual,
    getKibanaDir: jest.fn().mockReturnValue('/kibana'),
    areChangesSkippable: mockAreChangesSkippable,
    doAnyChangesMatch: mockDoAnyChangesMatch,
    doAllChangesMatch: mockDoAllChangesMatch,
    getAgentImageConfig: mockGetAgentImageConfig,
    flushCancelOnGateFailureMetadata: mockFlushCancelOnGateFailureMetadata,
    isAutomatedVersionBumpPR: mockIsAutomatedVersionBumpPR,
    getPrChangesCached: mockGetPrChangesCached,
    getAffectedPackages: mockGetAffectedPackages,
  };
});

jest.mock('./pre_build.ts', () => ({
  runPreBuild: mockRunPreBuild,
}));

jest.mock('../../../pipelines/evals/eval_pipeline.ts', () => ({
  getEvalTriggerStep: mockGetEvalTriggerStep,
}));

const ORIGINAL_ENV = process.env;

const importPipelineModule = async () => {
  await jest.isolateModulesAsync(async () => {
    await import('./pipeline.ts');
  });
};

const waitForEmission = () => {
  return new Promise<string>((resolve) => {
    jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      resolve(String(args[0]));
    });
  });
};

type EmittedStep = Record<string, unknown>;

// A step is identified by its key, else its label. A group lists its children after it.
const toIds = (steps: EmittedStep[], prefix = ''): string[] =>
  steps.flatMap((step) =>
    typeof step.group === 'string'
      ? [`${prefix}group:${step.group}`, ...toIds(step.steps as EmittedStep[], `${prefix}> `)]
      : [`${prefix}${String(step.key ?? step.label ?? ('wait' in step ? 'wait' : 'unknown'))}`]
  );

const emittedIds = async (): Promise<string[]> => {
  const emitted = waitForEmission();
  await importPipelineModule();
  const document = yamlLoad(await emitted) as { steps: EmittedStep[] };
  return toIds(document.steps);
};

interface Scenario {
  name: string;
  labels?: string[];
  targetBranch?: string;
  changedFiles?: string[];
  affectedPackages?: string[];
  evalsTriggerStep?: string;
}

const SCOUT_TESTS_ONLY = [
  'x-pack/platform/plugins/shared/triggers_actions_ui/test/scout/connectors/ui/tests/connector_jsm.spec.ts',
];

const SCENARIOS: Scenario[] = [
  { name: 'default, no changes' },
  { name: 'scout-tests-only diff', changedFiles: SCOUT_TESTS_ONLY },
  { name: 'renovate.json changed with other files', changedFiles: ['renovate.json', 'README.md'] },

  // Suites selected by the files that changed
  {
    name: 'kbn-handlebars path',
    changedFiles: ['src/platform/packages/private/kbn-handlebars/index.ts'],
  },
  {
    name: 'response ops path',
    changedFiles: ['x-pack/platform/plugins/shared/alerting/server/index.ts'],
  },
  {
    name: 'cases path',
    changedFiles: ['x-pack/platform/plugins/shared/cases/server/index.ts'],
  },
  {
    name: 'fleet path',
    changedFiles: ['x-pack/platform/plugins/shared/fleet/server/index.ts'],
  },
  {
    name: 'ai infra path',
    changedFiles: ['x-pack/platform/plugins/shared/inference/server/index.ts'],
  },
  {
    name: 'agent builder path',
    changedFiles: ['x-pack/platform/plugins/shared/agent_builder/server/index.ts'],
  },
  {
    name: 'security solution path',
    changedFiles: ['x-pack/solutions/security/plugins/security_solution/public/index.ts'],
  },
  {
    name: 'defend workflows test path',
    changedFiles: ['x-pack/solutions/security/test/defend_workflows_cypress/index.ts'],
  },
  {
    name: 'osquery path',
    changedFiles: ['x-pack/platform/plugins/shared/osquery/server/index.ts'],
  },
  {
    name: 'cloud security posture path',
    changedFiles: ['x-pack/solutions/security/plugins/cloud_security_posture/server/index.ts'],
  },
  {
    name: 'asset inventory path',
    changedFiles: [
      'x-pack/solutions/security/plugins/security_solution/public/asset_inventory/index.ts',
    ],
  },
  { name: 'edr real fleet path', changedFiles: ['fleet_packages.json'] },
  {
    name: 'prompt change path',
    changedFiles: [
      'x-pack/solutions/security/plugins/elastic_assistant/server/lib/prompt/prompts.ts',
    ],
  },
  {
    name: 'workflows schema path',
    changedFiles: ['src/platform/plugins/shared/workflows_management/common/schema/index.ts'],
  },
  { name: 'storybook path', changedFiles: ['x-pack/example/button.stories.tsx'] },
  { name: 'storybook lockfile path', changedFiles: ['pnpm-lock.yaml'] },
  { name: 'storybook toolchain package affected', affectedPackages: ['@kbn/storybook'] },
  {
    name: 'docs path on main',
    targetBranch: 'main',
    changedFiles: ['dev_docs/some_page.mdx'],
  },
  {
    name: 'docs path off main',
    targetBranch: '9.3',
    changedFiles: ['dev_docs/some_page.mdx'],
  },

  // Suites selected by labels
  { name: 'all cypress suites', labels: ['ci:all-cypress-suites'] },
  { name: 'all gen ai suites', labels: ['ci:all-gen-ai-suites'] },
  { name: 'all ui test suites', labels: ['ci:all-ui-test-suites'] },
  {
    name: 'osquery skipped',
    labels: ['ci:all-cypress-suites', 'ci:skip-cypress-osquery'],
  },
  { name: 'agent builder smoke tests label', labels: ['agent-builder:run-smoke-tests'] },
  {
    name: 'agent builder smoke tests skipped',
    labels: ['agent-builder:run-smoke-tests', 'agent-builder:skip-smoke-tests'],
  },
  { name: 'cloud image', labels: ['ci:build-cloud-image'] },
  { name: 'cloud fips image', labels: ['ci:build-cloud-fips-image'] },
  { name: 'cloud deploy', labels: ['ci:deploy-cloud'] },
  { name: 'cloud image with deploy label', labels: ['ci:build-cloud-image', 'ci:deploy-cloud'] },
  { name: 'docker fips', labels: ['ci:build-docker-fips'] },
  { name: 'entity store performance', labels: ['ci:entity-store-performance'] },
  { name: 'project deploy on main', labels: ['ci:project-deploy-security'], targetBranch: 'main' },
  {
    name: 'project build off main',
    labels: ['ci:project-deploy-security', 'ci:build-serverless-image'],
    targetBranch: '9.3',
  },
  { name: 'storybooks label', labels: ['ci:build-storybooks'] },
  { name: 'next docs label', labels: ['ci:build-next-docs'] },
  { name: 'cypress burn', labels: ['ci:cypress-burn'] },
  { name: 'gen ai evals', labels: ['ci:security-genai-run-evals'] },
  { name: 'scout cspm label', labels: ['ci:cloud-security-posture-scout'] },
  { name: 'scout edr label', labels: ['ci:scout-edr-real-fleet'] },
  { name: 'sync model labels', labels: ['ci:sync-model-labels'] },
  { name: 'workflow oom label', labels: ['ci:workflow-oom-test'] },
  { name: 'cps test', labels: ['ci:cps-test'] },
  { name: 'benchmarks', labels: ['ci:bench-jest', 'ci:bench-ftr', 'ci:bench-page-load'] },
  { name: 'code quality', labels: ['ci:run-code-quality'] },
  { name: 'fips verification', labels: [FIPS_GH_LABELS[FIPS_VERSION.TWO]] },
  {
    name: 'evals trigger step',
    evalsTriggerStep: [
      `  - label: ':robot_face: Trigger LLM Evals'`,
      `    key: kibana-evals-trigger`,
      `    depends_on:`,
      `      - build`,
      `    command: bash .buildkite/scripts/steps/evals/trigger_pr_evals.sh`,
      `    soft_fail: true`,
    ].join('\n'),
  },
];

describe('pull_request pipeline scenarios', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };

    delete process.env.GITHUB_PR_LABELS;
    delete process.env.GITHUB_PR_TARGET_BRANCH;

    mockAreChangesSkippable.mockResolvedValue(false);
    mockDoAnyChangesMatch.mockResolvedValue(false);
    mockDoAllChangesMatch.mockResolvedValue(false);
    mockGetAgentImageConfig.mockReturnValue('agents:\n  provider: gcp\n');
    mockRunPreBuild.mockResolvedValue(undefined);
    mockGetEvalTriggerStep.mockReturnValue(null);
    mockIsAutomatedVersionBumpPR.mockResolvedValue(false);
    mockGetPrChangesCached.mockResolvedValue([]);
    mockGetAffectedPackages.mockResolvedValue(new Set());

    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it.each(SCENARIOS.map((scenario) => [scenario.name, scenario] as const))(
    '%s',
    async (_name, scenario) => {
      const changes = (scenario.changedFiles ?? []).map((filename) => ({ filename }));
      mockGetPrChangesCached.mockResolvedValue(changes);
      mockDoAnyChangesMatch.mockImplementation((paths, scopedChanges) =>
        realDoAnyChangesMatch(paths, scopedChanges ?? changes)
      );
      process.env.GITHUB_PR_LABELS = (scenario.labels ?? []).join(',');
      if (scenario.targetBranch) {
        process.env.GITHUB_PR_TARGET_BRANCH = scenario.targetBranch;
      }
      if (scenario.affectedPackages) {
        mockGetAffectedPackages.mockResolvedValue(new Set(scenario.affectedPackages));
      }
      if (scenario.evalsTriggerStep) {
        mockGetEvalTriggerStep.mockReturnValue(scenario.evalsTriggerStep);
      }

      expect(await emittedIds()).toMatchSnapshot();
    }
  );

  // These return before pre-build runs, so the table above cannot express them.
  it('skippable changes', async () => {
    mockAreChangesSkippable.mockResolvedValue(true);

    expect(await emittedIds()).toMatchSnapshot();
  });

  it('automated version bump', async () => {
    mockIsAutomatedVersionBumpPR.mockResolvedValue(true);

    expect(await emittedIds()).toMatchSnapshot();
  });

  it('renovate.json is the only change', async () => {
    mockDoAllChangesMatch.mockResolvedValue(true);

    expect(await emittedIds()).toMatchSnapshot();
  });
});
