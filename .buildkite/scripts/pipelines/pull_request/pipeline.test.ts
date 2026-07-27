/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse as yamlLoad } from 'yaml';
import { FIPS_GH_LABELS, FIPS_VERSION } from '#pipeline-utils/pr_labels';

const mockAreChangesSkippable = jest.fn();
const mockDoAnyChangesMatch = jest.fn();
const mockDoAllChangesMatch = jest.fn();
const mockGetAgentImageConfig = jest.fn();
const mockFlushCancelOnGateFailureMetadata = jest.fn();
const mockRunPreBuild = jest.fn();
const mockGetEvalTriggerStep = jest.fn();
const mockIsAutomatedVersionBumpPR = jest.fn();

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
  };
});

jest.mock('./pre_build', () => ({
  runPreBuild: mockRunPreBuild,
}));

jest.mock('../../../pipelines/evals/eval_pipeline', () => ({
  getEvalTriggerStep: mockGetEvalTriggerStep,
}));

const ORIGINAL_ENV = process.env;

const importPipelineModule = async () => {
  await jest.isolateModulesAsync(async () => {
    await import('./pipeline');
  });
};

const waitForEmission = () => {
  return new Promise<string>((resolve) => {
    jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      resolve(String(args[0]));
    });
  });
};

const waitForExit = () => {
  return new Promise<number>((resolve) => {
    jest.spyOn(process, 'exit').mockImplementation(((code: number) => {
      resolve(code);
    }) as never);
  });
};

describe('pull_request pipeline generation', () => {
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('emits valid empty pipeline when changes are skippable', async () => {
    mockAreChangesSkippable.mockResolvedValueOnce(true);
    const emitted = waitForEmission();

    await importPipelineModule();
    const output = await emitted;

    const parsed = yamlLoad(output) as Record<string, unknown>;
    expect(parsed).toEqual({ steps: [] });
    expect(mockRunPreBuild).not.toHaveBeenCalled();
  });

  it('emits valid renovate-only pipeline and skips pre-build', async () => {
    mockDoAllChangesMatch.mockResolvedValueOnce(true);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const emitted = waitForEmission();

    await importPipelineModule();
    const output = await emitted;

    expect(mockRunPreBuild).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      'Isolated changes to renovate.json. Skipping main PR pipeline.'
    );

    const parsed = yamlLoad(output) as Record<string, unknown>;
    expect(parsed).toHaveProperty('steps');
    expect(output).toContain('renovate.sh');
  });

  it('waits for pre-build then emits valid YAML with base pipeline structure', async () => {
    let resolvePreBuild!: () => void;
    mockRunPreBuild.mockReturnValue(
      new Promise<void>((resolve) => {
        resolvePreBuild = resolve;
      })
    );

    const emitted = waitForEmission();

    await importPipelineModule();
    await new Promise((r) => setImmediate(r));

    expect(console.log).not.toHaveBeenCalled();

    resolvePreBuild();
    const output = await emitted;

    const parsed = yamlLoad(output) as Record<string, unknown>;
    expect(parsed).toHaveProperty('steps');
    const steps = parsed.steps as unknown[];
    expect(steps.length).toBeGreaterThan(0);
    expect(output).toContain('Build Kibana Distribution');
    expect(output).toContain('post_build.sh');
  });

  it('emits a step that triggers the dedicated evals pipeline (not an inline group) when labels match', async () => {
    mockGetEvalTriggerStep.mockReturnValue(
      [
        `  - label: ':robot_face: Trigger LLM Evals'`,
        `    key: kibana-evals-trigger`,
        `    depends_on:`,
        `      - build`,
        `    command: bash .buildkite/scripts/steps/evals/trigger_pr_evals.sh`,
        `    soft_fail: true`,
      ].join('\n')
    );
    const emitted = waitForEmission();

    await importPipelineModule();
    const output = await emitted;

    expect(output).toContain('trigger_pr_evals.sh');
    // Evals must not run inline in kibana-pull-request anymore.
    expect(output).not.toContain('group: LLM Evals');

    const parsed = yamlLoad(output) as { steps: Array<Record<string, unknown>> };
    const triggerStep = parsed.steps.find((step) => step.key === 'kibana-evals-trigger');
    expect(triggerStep).toMatchObject({ soft_fail: true, depends_on: ['build'] });
  });

  it('does not emit an evals trigger when no eval labels match', async () => {
    mockGetEvalTriggerStep.mockReturnValue(null);
    const emitted = waitForEmission();

    await importPipelineModule();
    const output = await emitted;

    expect(output).not.toContain('kibana-evals-trigger');
  });

  it('includes FIPS verification step when FIPS label is present', async () => {
    process.env.GITHUB_PR_LABELS = FIPS_GH_LABELS[FIPS_VERSION.TWO];
    const emitted = waitForEmission();

    await importPipelineModule();
    const output = await emitted;

    expect(output).toContain('Verify FIPS Enabled');
  });

  it('does not emit pipeline and exits when pre-build fails', async () => {
    mockRunPreBuild.mockRejectedValue(new Error('pre-build failed'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const logSpy = jest.spyOn(console, 'log');
    const exited = waitForExit();

    await importPipelineModule();
    const exitCode = await exited;

    expect(exitCode).toBe(1);
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error while generating the pipeline steps:'),
      expect.any(Error)
    );
  });

  it('emits empty pipeline for automated version bump PRs from kibanamachine', async () => {
    mockIsAutomatedVersionBumpPR.mockResolvedValueOnce(true);
    const emitted = waitForEmission();

    await importPipelineModule();
    const output = await emitted;

    const parsed = yamlLoad(output) as Record<string, unknown>;
    expect(parsed).toEqual({ steps: [] });
    expect(mockRunPreBuild).not.toHaveBeenCalled();
    expect(mockAreChangesSkippable).not.toHaveBeenCalled();
  });
});
