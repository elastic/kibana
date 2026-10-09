/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockGetEvalPipeline = jest.fn();
const mockEmitPipeline = jest.fn();
const mockGetPipeline = jest.fn();

jest.mock('../../../pipelines/evals/eval_pipeline', () => ({
  getEvalPipeline: mockGetEvalPipeline,
}));

jest.mock('#pipeline-utils', () => ({
  emitPipeline: mockEmitPipeline,
  getPipeline: mockGetPipeline,
}));

const ORIGINAL_ENV = process.env;

const importPipelineModule = async () => {
  await jest.isolateModulesAsync(async () => {
    await import('./pipeline');
  });
};

describe('evals_pr pipeline generation', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    process.env.GITHUB_PR_LABELS = 'evals:smoke-tests,models:eis/openai-gpt-5.4';
    // Stand in for the canonical post_build.yml fragment reused via getPipeline.
    mockGetPipeline.mockReturnValue(
      '  - wait: ~\n    continue_on_failure: true\n\n  - command: .buildkite/scripts/lifecycle/post_build.sh\n    label: Post-Build'
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('emits pre-build, build, the eval group, and a trailing post-build barrier', async () => {
    mockGetEvalPipeline.mockReturnValue('  - group: LLM Evals\n    key: kibana-evals');

    await importPipelineModule();

    expect(mockEmitPipeline).toHaveBeenCalledTimes(1);
    const yaml = (mockEmitPipeline.mock.calls[0][0] as string[]).join('\n');

    expect(yaml).toContain('pre_build.sh');
    expect(yaml).toContain('build_kibana.sh');
    expect(yaml).toContain('group: LLM Evals');
    // Post-Build is the canonical step reused (not duplicated) behind a trailing-wait barrier.
    expect(mockGetPipeline).toHaveBeenCalledWith(
      '.buildkite/pipelines/pull_request/post_build.yml'
    );
    expect(yaml).toContain('post_build.sh');
    expect(yaml).toContain('wait: ~');
    expect(yaml).toContain('continue_on_failure: true');
  });

  it('fails loudly (exit 1) instead of emitting an empty pipeline when no suites match', async () => {
    mockGetEvalPipeline.mockReturnValue(null);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    // Throw from the mocked exit so execution halts exactly like the real `never`-returning
    // process.exit, instead of falling through to emitPipeline.
    jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code}`);
    }) as never);

    await expect(importPipelineModule()).rejects.toThrow('process.exit:1');

    expect(mockEmitPipeline).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('No eval suites matched'));
  });
});
