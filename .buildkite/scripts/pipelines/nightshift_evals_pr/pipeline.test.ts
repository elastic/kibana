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

describe('nightshift_evals_pr pipeline generation', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('emits pre-build, the plan step and a trailing post-build, without a Kibana build', async () => {
    process.env.GITHUB_PR_LABELS = 'nightshift-evals:ki_feature_extraction';

    await importPipelineModule();

    const yaml = (mockEmitPipeline.mock.calls[0][0] as string[]).join('\n');
    expect(yaml).toContain('pre_build.sh');
    expect(yaml).toContain('plan_steps.sh');
    expect(yaml).not.toContain('build_kibana.sh');
    expect(yaml).toContain('post_build.sh');
    expect(yaml).toContain('continue_on_failure: true');
  });

  it('fails loudly when no task label is forwarded', async () => {
    process.env.GITHUB_PR_LABELS = 'evals:smoke-tests';
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code}`);
    }) as never);

    await expect(importPipelineModule()).rejects.toThrow('process.exit:1');
    expect(mockEmitPipeline).not.toHaveBeenCalled();
  });
});
