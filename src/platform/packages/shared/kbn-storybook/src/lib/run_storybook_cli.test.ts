/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { build } from '@storybook/core-server';
import { runSharedBuild } from '@kbn/rspack-optimizer';
import { buildStorybook } from './run_storybook_cli';

jest.mock('@storybook/core-server', () => ({ build: jest.fn() }));
jest.mock('@kbn/rspack-optimizer', () => ({ runSharedBuild: jest.fn() }));
jest.mock('fix-esm', () => ({ require: jest.fn(), unregister: jest.fn() }));

const buildMock = build as jest.MockedFunction<typeof build>;
const runSharedBuildMock = runSharedBuild as jest.MockedFunction<typeof runSharedBuild>;

describe('buildStorybook', () => {
  const close = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    runSharedBuildMock.mockResolvedValue({ success: true, close });
  });

  it('keeps the shared watcher open after the dev server starts', async () => {
    buildMock.mockResolvedValue(undefined);

    await buildStorybook({ configDir: 'config', name: 'test' });

    expect(runSharedBuildMock).toHaveBeenCalledWith(expect.objectContaining({ watch: true }));
    expect(close).not.toHaveBeenCalled();
  });

  it('closes the shared watcher when the dev server fails to start', async () => {
    buildMock.mockRejectedValue(new Error('boom'));

    await expect(buildStorybook({ configDir: 'config', name: 'test' })).rejects.toThrow('boom');

    expect(close).toHaveBeenCalledTimes(1);
  });
});
