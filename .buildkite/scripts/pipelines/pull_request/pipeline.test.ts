/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockAreChangesSkippable = jest.fn();
const mockDoAnyChangesMatch = jest.fn();
const mockGetAgentImageConfig = jest.fn();
const mockEmitPipeline = jest.fn();
const mockGetPipeline = jest.fn();
const mockPrHasFIPSLabel = jest.fn();
const mockRunPreBuild = jest.fn();
const mockGetEvalPipeline = jest.fn();

jest.mock('#pipeline-utils', () => ({
  areChangesSkippable: mockAreChangesSkippable,
  doAnyChangesMatch: mockDoAnyChangesMatch,
  getAgentImageConfig: mockGetAgentImageConfig,
  emitPipeline: mockEmitPipeline,
  getPipeline: mockGetPipeline,
  prHasFIPSLabel: mockPrHasFIPSLabel,
}));

jest.mock('./pre_build', () => ({
  runPreBuild: mockRunPreBuild,
}));

jest.mock('../../../pipelines/evals/eval_pipeline', () => ({
  getEvalPipeline: mockGetEvalPipeline,
}));

const ORIGINAL_ENV = process.env;

const flushAsyncWork = async (iterations = 60) => {
  for (let i = 0; i < iterations; i++) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
};

const importPipelineModule = async () => {
  await jest.isolateModulesAsync(async () => {
    await import('./pipeline');
  });
};

describe('pull_request pipeline generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };

    delete process.env.GITHUB_PR_LABELS;
    delete process.env.GITHUB_PR_TARGET_BRANCH;

    mockAreChangesSkippable.mockResolvedValue(false);
    mockDoAnyChangesMatch.mockResolvedValue(false);
    mockGetAgentImageConfig.mockReturnValue('agent-image-yaml');
    mockGetPipeline.mockImplementation((pipelinePath: string) => `yaml:${pipelinePath}`);
    mockPrHasFIPSLabel.mockReturnValue(false);
    mockEmitPipeline.mockImplementation(() => undefined);
    mockRunPreBuild.mockResolvedValue(undefined);
    mockGetEvalPipeline.mockReturnValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('emits an empty pipeline when changes are skippable', async () => {
    mockAreChangesSkippable.mockResolvedValueOnce(true);

    await importPipelineModule();
    await flushAsyncWork();

    expect(mockEmitPipeline).toHaveBeenCalledTimes(1);
    expect(mockEmitPipeline).toHaveBeenCalledWith(['steps: []']);
    expect(mockRunPreBuild).not.toHaveBeenCalled();
  });

  it('emits renovate-only pipeline and skips pre-build', async () => {
    mockAreChangesSkippable.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    await importPipelineModule();
    await flushAsyncWork();

    expect(mockRunPreBuild).not.toHaveBeenCalled();
    expect(mockEmitPipeline).toHaveBeenCalledWith([
      'agent-image-yaml',
      'yaml:.buildkite/pipelines/pull_request/renovate.yml',
    ]);
    expect(warnSpy).toHaveBeenCalledWith(
      'Isolated changes to renovate.json. Skipping main PR pipeline.'
    );
  });

  it('waits for pre-build completion before emitting the main pipeline skeleton', async () => {
    let resolvePreBuild: () => void = () => {};
    const preBuildPromise = new Promise<void>((resolve) => {
      resolvePreBuild = resolve;
    });
    mockRunPreBuild.mockReturnValue(preBuildPromise);

    await importPipelineModule();
    await flushAsyncWork(10);

    expect(mockEmitPipeline).not.toHaveBeenCalled();

    resolvePreBuild();
    await flushAsyncWork();

    expect(mockEmitPipeline).toHaveBeenCalledTimes(1);
    const emittedPipeline = mockEmitPipeline.mock.calls[0][0] as string[];

    expect(emittedPipeline).toEqual([
      'agent-image-yaml',
      'yaml:.buildkite/pipelines/pull_request/base.yml',
      'yaml:.buildkite/pipelines/pull_request/api_contracts.yml',
      'yaml:.buildkite/pipelines/pull_request/post_build.yml',
    ]);
    expect(mockRunPreBuild.mock.invocationCallOrder[0]).toBeLessThan(
      mockEmitPipeline.mock.invocationCallOrder[0]
    );
  });

  it('includes FIPS verification pipeline when FIPS label is present', async () => {
    mockPrHasFIPSLabel.mockReturnValue(true);

    await importPipelineModule();
    await flushAsyncWork();

    const emittedPipeline = mockEmitPipeline.mock.calls[0][0] as string[];
    expect(emittedPipeline).toContain('yaml:.buildkite/pipelines/fips/verify_fips_enabled.yml');
  });

  it('does not emit pipeline and exits when pre-build fails', async () => {
    const testError = new Error('pre-build failed');
    mockRunPreBuild.mockRejectedValue(testError);

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await importPipelineModule();
    await flushAsyncWork();

    expect(mockEmitPipeline).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error while generating the pipeline steps:'),
      testError
    );
  });
});
