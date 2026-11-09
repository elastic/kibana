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

// Same behavior as the real getPipeline without options: the file, minus its leading `steps:`.
const mockGetPipeline = jest.fn((filename: string) =>
  fs
    .readFileSync(Path.resolve(__dirname, '../../../..', filename))
    .toString()
    .replace(/^steps:/, '')
);

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

describe('static_checks pipeline generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRunPreBuild.mockResolvedValue(undefined);
  });

  it('emits the static check steps and the post-build step, without the build or test suites', async () => {
    await importPipelineModule();

    expect(mockEmitPipeline).toHaveBeenCalledTimes(1);
    const [chunks] = mockEmitPipeline.mock.calls[0];
    const { steps } = parse(chunks.join('\n'));

    const names = steps.map(
      ({ key, label, wait }: { key?: string; label?: string; wait?: null }) =>
        key ?? label ?? (wait === null ? 'wait' : undefined)
    );

    expect(names).toEqual([
      'quick_checks',
      'checks',
      'linting',
      'check_types',
      'check',
      'wait',
      'Post-Build',
    ]);
  });

  it('fails when pre_build fails', async () => {
    mockRunPreBuild.mockRejectedValue(new Error('pre_build failed'));
    const exit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await importPipelineModule();

    expect(exit).toHaveBeenCalledWith(1);
    expect(mockEmitPipeline).not.toHaveBeenCalled();
  });
});
