/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { promises as fs, existsSync } from 'fs';
import { ToolingLog } from '@kbn/tooling-log';
import { findProductionDependencies, readPnpmLock } from '@kbn/yarn-lock-validator';
import { loadPackageJson } from './helpers';
import { checkProdNativeModules } from './check_prod_native_modules';

jest.mock('fs', () => ({
  promises: { readdir: jest.fn() },
  existsSync: jest.fn(),
}));
jest.mock('@kbn/repo-info', () => ({ REPO_ROOT: '/repo' }));
jest.mock('@kbn/yarn-lock-validator');
jest.mock('./helpers');

const mockDependencies = (name: string, version: string, withNativeChild = false) => {
  const profilerPath = '/repo/node_modules/@datadog/pprof';
  const childPath = `${profilerPath}/node_modules/native-child`;
  const directories = new Map([
    ['/repo/node_modules', ['@datadog']],
    ['/repo/node_modules/@datadog', ['pprof']],
    [profilerPath, ['binding.gyp']],
    [`${profilerPath}/node_modules`, withNativeChild ? ['native-child'] : []],
    [childPath, ['child.node']],
  ]);

  (existsSync as jest.Mock).mockReturnValue(true);
  (fs.readdir as jest.Mock).mockImplementation(async (directory: string) =>
    (directories.get(directory) ?? []).map((entry) => ({
      name: entry,
      isDirectory: () => entry !== 'binding.gyp' && entry !== 'child.node',
    }))
  );
  jest
    .mocked(loadPackageJson)
    .mockImplementation((packageJsonPath: string) =>
      packageJsonPath === `${childPath}/package.json`
        ? { name: 'native-child', version: '1.0.0' }
        : { name, version }
    );
  jest.mocked(readPnpmLock).mockResolvedValue({
    rootDependencies: {},
    rootDevDependencies: {},
    snapshots: {},
  });
  jest.mocked(findProductionDependencies).mockReturnValue(
    new Map([
      [`${name}@${version}`, { name, version }],
      ['native-child@1.0.0', { name: 'native-child', version: '1.0.0' }],
    ])
  );
};

describe('pprof PoC native module exception', () => {
  beforeEach(() => jest.resetAllMocks());

  it('allows the exact pinned version with an explicit PoC warning', async () => {
    const log = new ToolingLog();
    const warning = jest.spyOn(log, 'warning');
    mockDependencies('@datadog/pprof', '5.19.0');

    expect(await checkProdNativeModules(log)).toBe(false);
    expect(warning).toHaveBeenCalledWith(
      'Temporary PoC exception: @datadog/pprof@5.19.0 (PR #295800; not for merge)'
    );
  });

  it.each([
    ['@datadog/pprof', '5.19.1'],
    ['@datadog/pprof', '5.18.0'],
    ['@datadog/another-profiler', '5.19.0'],
  ])('rejects native dependency %s@%s', async (name, version) => {
    const log = new ToolingLog();
    const error = jest.spyOn(log, 'error');
    const warning = jest.spyOn(log, 'warning');
    mockDependencies(name, version);

    expect(await checkProdNativeModules(log)).toBe(true);
    expect(error).toHaveBeenCalledWith(
      'Production native module detected: node_modules/@datadog/pprof'
    );
    expect(warning).not.toHaveBeenCalled();
  });

  it('still rejects native dependencies nested below the allowed profiler', async () => {
    const log = new ToolingLog();
    const error = jest.spyOn(log, 'error');
    const warning = jest.spyOn(log, 'warning');
    mockDependencies('@datadog/pprof', '5.19.0', true);

    expect(await checkProdNativeModules(log)).toBe(true);
    expect(warning).toHaveBeenCalledWith(
      'Temporary PoC exception: @datadog/pprof@5.19.0 (PR #295800; not for merge)'
    );
    expect(error).toHaveBeenCalledWith(
      'Production native module detected: node_modules/@datadog/pprof/node_modules/native-child'
    );
  });
});
