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
import { runBuildApiDocsCli } from './build_api_docs_cli';
import {
  parseCliFlags,
  setupProject,
  buildApiMap,
  collectStats,
  reportMetrics,
  writeDocs,
} from './cli';
import { runCheckPackageDocs } from './check_package_docs_cli';

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

let registeredHandler: any;
vi.mock('@kbn/dev-cli-runner', () => {
      const mocked = {
      run: vi.fn((handler: any) => {
        registeredHandler = handler;
      }),
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
      writeDocs: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./check_package_docs_cli', () => {
      const mocked = {
      runCheckPackageDocs: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const mockTx = (apm as any).__tx;

describe('build_api_docs_cli', () => {
  const log = { info: vi.fn(), warning: vi.fn(), error: vi.fn() };

  beforeEach(() => {
    registeredHandler = undefined;
    vi.clearAllMocks();
  });

  it('routes --stats to check CLI and skips build tasks', async () => {
    (parseCliFlags as Mock).mockReturnValue({ stats: ['any'], collectReferences: false });

    runBuildApiDocsCli();
    expect(registeredHandler).toBeDefined();

    await registeredHandler({ log, flags: { stats: 'any' } });

    expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('--stats is deprecated'));
    expect(runCheckPackageDocs).toHaveBeenCalledWith(log, { stats: 'any' });
    expect(setupProject).not.toHaveBeenCalled();
    expect(mockTx.end).toHaveBeenCalled();
  });

  it('runs build flow when stats are not provided', async () => {
    const mockPlugins = [
      { id: 'p1', manifest: { owner: { name: 'team' }, serviceFolders: [] }, isPlugin: true },
    ];
    const setupResult = {
      project: {},
      plugins: mockPlugins,
      allPlugins: mockPlugins,
    };
    const apiMapResult = {
      pluginApiMap: {},
      missingApiItems: {},
      referencedDeprecations: {},
      unreferencedDeprecations: {},
      adoptionTrackedAPIs: {},
    };
    (parseCliFlags as Mock).mockReturnValue({ stats: undefined, collectReferences: false });
    (setupProject as Mock).mockResolvedValue(setupResult);
    (buildApiMap as Mock).mockReturnValue(apiMapResult);
    (collectStats as Mock).mockResolvedValue({});

    runBuildApiDocsCli();
    await registeredHandler({ log, flags: {} });

    expect(setupProject).toHaveBeenCalled();
    expect(buildApiMap).toHaveBeenCalledWith(
      setupResult.project,
      setupResult.plugins,
      setupResult.allPlugins,
      log,
      mockTx,
      { stats: undefined, collectReferences: false }
    );
    expect(collectStats).toHaveBeenCalled();
    expect(reportMetrics).toHaveBeenCalled();
    expect(writeDocs).toHaveBeenCalled();
    expect(mockTx.end).toHaveBeenCalled();
  });
});
