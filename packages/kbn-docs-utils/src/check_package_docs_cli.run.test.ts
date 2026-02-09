/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import apm from 'elastic-apm-node';
import { runCheckPackageDocs } from './check_package_docs_cli';
import { parseCliFlags, setupProject, buildApiMap, collectStats, reportMetrics } from './cli';

jest.mock('elastic-apm-node', () => {
  const tx = {
    startSpan: jest.fn(),
    end: jest.fn(),
    setOutcome: jest.fn(),
  };
  return {
    startTransaction: jest.fn(() => tx),
    isStarted: jest.fn(() => false),
    flush: jest.fn(),
    __tx: tx,
  };
});

jest.mock('@kbn/apm-config-loader', () => ({
  initApm: jest.fn(),
}));

jest.mock('./cli', () => ({
  parseCliFlags: jest.fn(),
  setupProject: jest.fn(),
  buildApiMap: jest.fn(),
  collectStats: jest.fn(),
  reportMetrics: jest.fn(),
}));

const mockTx = (apm as any).__tx;

const plugin = {
  id: 'plugin-a',
  manifest: { owner: { name: 'team' }, serviceFolders: [] },
  isPlugin: true,
};

describe('runCheckPackageDocs', () => {
  const log = { info: jest.fn(), warning: jest.fn(), error: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    process.exitCode = undefined;
  });

  it('sets exitCode when validation fails', async () => {
    (parseCliFlags as jest.Mock).mockReturnValue({ stats: ['any'], pluginFilter: ['plugin-a'] });
    (setupProject as jest.Mock).mockResolvedValue({ plugins: [plugin], project: {} });
    (buildApiMap as jest.Mock).mockReturnValue({
      pluginApiMap: { 'plugin-a': { id: 'plugin-a', client: [], server: [], common: [] } },
      missingApiItems: { 'plugin-a': { 'src/path.ts': ['ref'] } },
      referencedDeprecations: {},
      unreferencedDeprecations: {},
      adoptionTrackedAPIs: {},
    });
    (collectStats as jest.Mock).mockResolvedValue({
      'plugin-a': {
        missingComments: [],
        isAnyType: [{ id: 'x' }],
        noReferences: [],
        apiCount: 1,
        missingExports: 1,
        deprecatedAPIsReferencedCount: 0,
        unreferencedDeprecatedApisCount: 0,
        adoptionTrackedAPIs: [],
        adoptionTrackedAPIsCount: 0,
        adoptionTrackedAPIsUnreferencedCount: 0,
        owner: { name: 'team' },
        description: '',
        isPlugin: true,
        eslintDisableFileCount: 0,
        eslintDisableLineCount: 0,
        enzymeImportCount: 0,
      },
    });

    await runCheckPackageDocs(log as any, { plugin: 'plugin-a' } as any);

    expect(parseCliFlags).toHaveBeenCalledWith({ plugin: 'plugin-a' });
    expect(reportMetrics).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    expect(log.error).toHaveBeenCalledWith(
      expect.stringContaining('Validation failed for 1 plugin')
    );
    expect(mockTx.end).toHaveBeenCalled();
  });

  it('passes when there are no validation issues', async () => {
    (parseCliFlags as jest.Mock).mockReturnValue({ stats: ['any'], pluginFilter: ['plugin-a'] });
    (setupProject as jest.Mock).mockResolvedValue({ plugins: [plugin], project: {} });
    (buildApiMap as jest.Mock).mockReturnValue({
      pluginApiMap: { 'plugin-a': { id: 'plugin-a', client: [], server: [], common: [] } },
      missingApiItems: {},
      referencedDeprecations: {},
      unreferencedDeprecations: {},
      adoptionTrackedAPIs: {},
    });
    (collectStats as jest.Mock).mockResolvedValue({
      'plugin-a': {
        missingComments: [],
        isAnyType: [],
        noReferences: [],
        apiCount: 1,
        missingExports: 0,
        deprecatedAPIsReferencedCount: 0,
        unreferencedDeprecatedApisCount: 0,
        adoptionTrackedAPIs: [],
        adoptionTrackedAPIsCount: 0,
        adoptionTrackedAPIsUnreferencedCount: 0,
        owner: { name: 'team' },
        description: '',
        isPlugin: true,
        eslintDisableFileCount: 0,
        eslintDisableLineCount: 0,
        enzymeImportCount: 0,
      },
    });

    await runCheckPackageDocs(log as any, { plugin: 'plugin-a' } as any);

    expect(process.exitCode).toBeUndefined();
    expect(log.info).toHaveBeenCalledWith('All plugins passed validation.');
    expect(mockTx.end).toHaveBeenCalled();
  });
});
