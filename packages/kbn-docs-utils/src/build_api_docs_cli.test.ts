/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
import { resolveAffectedBuildPlanFromMoon } from './build_api_docs_affected';

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

let registeredHandler: any;
jest.mock('@kbn/dev-cli-runner', () => ({
  run: jest.fn((handler: any) => {
    registeredHandler = handler;
  }),
}));

jest.mock('./cli', () => ({
  parseCliFlags: jest.fn(),
  setupProject: jest.fn(),
  buildApiMap: jest.fn(),
  collectStats: jest.fn(),
  reportMetrics: jest.fn(),
  writeDocs: jest.fn(),
}));

jest.mock('./check_package_docs_cli', () => ({
  runCheckPackageDocs: jest.fn(),
}));

jest.mock('./build_api_docs_affected', () => ({
  resolveAffectedBuildPlanFromMoon: jest.fn(() => ({
    mode: 'full',
    pluginFilter: [],
    packageFilter: [],
    message: 'Falling back to full build.',
  })),
}));

const mockTx = (apm as any).__tx;

describe('build_api_docs_cli', () => {
  const log = { info: jest.fn(), warning: jest.fn(), error: jest.fn() };

  beforeEach(() => {
    registeredHandler = undefined;
    jest.clearAllMocks();
  });

  it('routes --stats to check CLI and skips build tasks', async () => {
    (parseCliFlags as jest.Mock).mockReturnValue({
      fullBuild: false,
      changesMode: undefined,
      stats: ['any'],
      collectReferences: false,
    });

    runBuildApiDocsCli();
    expect(registeredHandler).toBeDefined();

    await registeredHandler({ log, flags: { stats: 'any' } });

    expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('--stats is deprecated'));
    expect(runCheckPackageDocs).toHaveBeenCalledWith(log, { stats: 'any' });
    expect(setupProject).not.toHaveBeenCalled();
    expect(mockTx.end).toHaveBeenCalled();
  });

  it('runs build flow when stats are not provided', async () => {
    const setupResult = {
      project: {},
      plugins: [
        { id: 'p1', manifest: { owner: { name: 'team' }, serviceFolders: [] }, isPlugin: true },
      ],
    };
    const apiMapResult = {
      pluginApiMap: {},
      missingApiItems: {},
      referencedDeprecations: {},
      unreferencedDeprecations: {},
      adoptionTrackedAPIs: {},
    };
    (parseCliFlags as jest.Mock).mockReturnValue({
      fullBuild: false,
      changesMode: undefined,
      stats: undefined,
      collectReferences: false,
    });
    (setupProject as jest.Mock).mockResolvedValue(setupResult);
    (buildApiMap as jest.Mock).mockReturnValue(apiMapResult);
    (collectStats as jest.Mock).mockResolvedValue({});

    runBuildApiDocsCli();
    await registeredHandler({ log, flags: {} });

    expect(setupProject).toHaveBeenCalled();
    expect(resolveAffectedBuildPlanFromMoon).toHaveBeenCalled();
    expect(buildApiMap).toHaveBeenCalledWith(
      setupResult.project,
      setupResult.plugins,
      log,
      mockTx,
      {
        fullBuild: false,
        stats: undefined,
        collectReferences: false,
      }
    );
    expect(collectStats).toHaveBeenCalled();
    expect(reportMetrics).toHaveBeenCalled();
    expect(writeDocs).toHaveBeenCalled();
    expect(mockTx.end).toHaveBeenCalled();
  });

  it('skips build flow when affected planning returns skip', async () => {
    (resolveAffectedBuildPlanFromMoon as jest.Mock).mockReturnValue({
      mode: 'skip',
      pluginFilter: [],
      packageFilter: [],
      message: 'No affected plugin/package targets found. Skipping API docs build.',
    });
    (parseCliFlags as jest.Mock).mockReturnValue({
      fullBuild: false,
      changesMode: undefined,
      stats: undefined,
      collectReferences: false,
    });

    runBuildApiDocsCli();
    await registeredHandler({ log, flags: {} });

    expect(setupProject).not.toHaveBeenCalled();
    expect(mockTx.end).toHaveBeenCalled();
  });

  it('does not resolve affected targets when full build is requested', async () => {
    const setupResult = {
      project: {},
      plugins: [
        { id: 'p1', manifest: { owner: { name: 'team' }, serviceFolders: [] }, isPlugin: true },
      ],
    };
    const apiMapResult = {
      pluginApiMap: {},
      missingApiItems: {},
      referencedDeprecations: {},
      unreferencedDeprecations: {},
      adoptionTrackedAPIs: {},
    };

    (parseCliFlags as jest.Mock).mockReturnValue({
      fullBuild: true,
      changesMode: undefined,
      stats: undefined,
      collectReferences: false,
    });
    (setupProject as jest.Mock).mockResolvedValue(setupResult);
    (buildApiMap as jest.Mock).mockReturnValue(apiMapResult);
    (collectStats as jest.Mock).mockResolvedValue({});

    runBuildApiDocsCli();
    await registeredHandler({ log, flags: { full: true } });

    expect(resolveAffectedBuildPlanFromMoon).not.toHaveBeenCalled();
    expect(setupProject).toHaveBeenCalled();
  });
});
