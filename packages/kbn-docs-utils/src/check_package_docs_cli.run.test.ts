/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import apm from 'elastic-apm-node';
import { runCheckPackageDocs } from './check_package_docs_cli';
import { parseCliFlags, setupProject, buildApiMap, collectStats, reportMetrics } from './cli';

vi.mock('elastic-apm-node', () => {
  const tx = {
    startSpan: vi.fn(),
    end: vi.fn(),
    setOutcome: vi.fn(),
  };
  return {
    startTransaction: vi.fn(() => tx),
    isStarted: vi.fn(() => false),
    flush: vi.fn(),
    __tx: tx,
  };
});

vi.mock('@kbn/apm-config-loader', () => {
      const mocked = {
      initApm: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./cli', () => {
      const mocked = {
      parseCliFlags: vi.fn(),
      setupProject: vi.fn(),
      buildApiMap: vi.fn(),
      collectStats: vi.fn(),
      reportMetrics: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const mockTx = (apm as any).__tx;

const plugin = {
  id: 'plugin-a',
  manifest: { owner: { name: 'team' }, serviceFolders: [] },
  isPlugin: true,
};

describe('runCheckPackageDocs', () => {
  const log = { info: vi.fn(), warning: vi.fn(), error: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
  });

  it('sets exitCode when validation fails', async () => {
    (parseCliFlags as Mock).mockReturnValue({ stats: ['any'], pluginFilter: ['plugin-a'] });
    (setupProject as Mock).mockResolvedValue({ plugins: [plugin], project: {} });
    (buildApiMap as Mock).mockReturnValue({
      pluginApiMap: { 'plugin-a': { id: 'plugin-a', client: [], server: [], common: [] } },
      missingApiItems: { 'plugin-a': { 'src/path.ts': ['ref'] } },
      referencedDeprecations: {},
      unreferencedDeprecations: {},
      adoptionTrackedAPIs: {},
    });
    (collectStats as Mock).mockResolvedValue({
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
      expect.stringContaining('Validation failed for 1 package')
    );
    expect(mockTx.end).toHaveBeenCalled();
  });

  it('passes when there are no validation issues', async () => {
    (parseCliFlags as Mock).mockReturnValue({ stats: ['any'], pluginFilter: ['plugin-a'] });
    (setupProject as Mock).mockResolvedValue({ plugins: [plugin], project: {} });
    (buildApiMap as Mock).mockReturnValue({
      pluginApiMap: { 'plugin-a': { id: 'plugin-a', client: [], server: [], common: [] } },
      missingApiItems: {},
      referencedDeprecations: {},
      unreferencedDeprecations: {},
      adoptionTrackedAPIs: {},
    });
    (collectStats as Mock).mockResolvedValue({
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
    expect(log.info).toHaveBeenCalledWith('All packages passed validation.');
    expect(mockTx.end).toHaveBeenCalled();
  });
});
