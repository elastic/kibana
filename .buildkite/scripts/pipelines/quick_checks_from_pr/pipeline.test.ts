/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import Path from 'path';
import { parse } from 'yaml';

const mockEmitPipeline = jest.fn();
const mockRunPreBuild = jest.fn();
const mockGetPipeline = jest.fn();

jest.mock('#pipeline-utils', () => ({
  emitPipeline: mockEmitPipeline,
  getAgentImageConfig: () => 'agents:\n  provider: gcp\n',
  getPipeline: mockGetPipeline,
}));

jest.mock('../pull_request/pre_build.ts', () => ({
  runPreBuild: mockRunPreBuild,
}));

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const importPipelineModule = async () => {
  await jest.isolateModulesAsync(async () => {
    await import('./pipeline.ts');
  });
  await flushPromises();
};

describe('quick_checks_from_pr pipeline generation', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRunPreBuild.mockResolvedValue(undefined);
  });

  it('emits only the quick gate steps from base.yml', async () => {
    mockGetPipeline.mockReturnValue(
      fs
        .readFileSync(Path.resolve(__dirname, '../../../pipelines/pull_request/base.yml'))
        .toString()
    );

    await importPipelineModule();

    expect(mockEmitPipeline).toHaveBeenCalledTimes(1);
    const [[, stepsYaml]] = mockEmitPipeline.mock.calls[0];
    const { steps } = parse(stepsYaml);
    expect(steps.map(({ key }: { key: string }) => key)).toEqual([
      'quick_checks',
      'checks',
      'linting',
      'check_types',
    ]);
  });

  it('fails when a quick gate step is missing from base.yml', async () => {
    mockGetPipeline.mockReturnValue('steps:\n  - label: Other\n    key: other\n');
    const exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await importPipelineModule();

    expect(exit).toHaveBeenCalledWith(1);
    expect(mockEmitPipeline).not.toHaveBeenCalled();
  });
});
