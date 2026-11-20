/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockEmitPipeline = jest.fn();

jest.mock('#pipeline-utils', () => ({
  emitPipeline: mockEmitPipeline,
}));

const ORIGINAL_ENV = process.env;

const importPipelineModule = async () => {
  await jest.isolateModulesAsync(async () => {
    await import('./pipeline.ts');
  });
};

const emittedYaml = (): string => (mockEmitPipeline.mock.calls[0][0] as string[]).join('\n');

describe('nightshift_evals pipeline generation', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.EVAL_PREEMPTIBLE;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('emits pre-build, the run and comment steps and a trailing post-build, without a Kibana build', async () => {
    await importPipelineModule();

    expect(mockEmitPipeline).toHaveBeenCalledTimes(1);
    const yaml = emittedYaml();
    expect(yaml).toContain('pre_build.sh');
    expect(yaml).toContain('run_task.sh');
    expect(yaml).toContain('post_pr_comment.sh');
    expect(yaml).not.toContain('build_kibana.sh');
    expect(yaml).not.toContain('plan_steps');
    expect(yaml).toContain('post_build.sh');
    expect(yaml).toContain('continue_on_failure: true');
  });

  it('needs no labels in the environment', async () => {
    delete process.env.GITHUB_PR_LABELS;
    await importPipelineModule();
    expect(emittedYaml()).toContain('run_task.sh');
  });

  it('runs on spot agents by default and on regular agents when EVAL_PREEMPTIBLE=0', async () => {
    await importPipelineModule();
    expect(emittedYaml()).toContain('preemptible: true');

    jest.resetModules();
    mockEmitPipeline.mockClear();
    process.env.EVAL_PREEMPTIBLE = '0';
    await importPipelineModule();
    expect(emittedYaml()).not.toContain('preemptible: true');
  });
});
