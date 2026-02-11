/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Project } from 'ts-morph';
import { ToolingLog } from '@kbn/tooling-log';
import { buildApiMap } from './build_api_map';
import type { CliOptions } from '../types';

// Mock getPluginApiMap
jest.mock('../../get_plugin_api_map', () => ({
  getPluginApiMap: jest.fn(() => ({
    pluginApiMap: {},
    missingApiItems: {},
    referencedDeprecations: {},
    unreferencedDeprecations: {},
    adoptionTrackedAPIs: {},
  })),
}));

import { getPluginApiMap } from '../../get_plugin_api_map';

describe('buildApiMap', () => {
  let project: Project;
  let log: ToolingLog;
  let transaction: any;
  let plugins: any[];

  beforeEach(() => {
    project = new Project({
      useInMemoryFileSystem: true,
    });

    log = new ToolingLog({
      level: 'silent',
      writeTo: process.stdout,
    });

    transaction = {
      startSpan: jest.fn(() => ({
        end: jest.fn(),
      })),
    };

    plugins = [
      {
        id: 'test-plugin',
        directory: 'src/plugins/test',
        isPlugin: true,
        manifest: {
          id: 'test-plugin',
          owner: { name: 'test-team' },
          serviceFolders: [],
        },
      },
    ];
  });

  it('calls getPluginApiMap with correct parameters', () => {
    const options: CliOptions = {
      collectReferences: true,
      pluginFilter: ['test-plugin'],
    };

    buildApiMap(project, plugins, log, transaction, options);

    expect(getPluginApiMap).toHaveBeenCalledWith(project, plugins, log, {
      collectReferences: true,
      pluginFilter: ['test-plugin'],
    });
  });

  it('returns result from getPluginApiMap', () => {
    const options: CliOptions = {
      collectReferences: false,
    };

    const result = buildApiMap(project, plugins, log, transaction, options);

    expect(result).toBeDefined();
    expect(result.pluginApiMap).toBeDefined();
    expect(result.missingApiItems).toBeDefined();
    expect(result.referencedDeprecations).toBeDefined();
    expect(result.unreferencedDeprecations).toBeDefined();
    expect(result.adoptionTrackedAPIs).toBeDefined();
  });

  it('creates APM span for tracking', () => {
    const options: CliOptions = {
      collectReferences: false,
    };

    buildApiMap(project, plugins, log, transaction, options);

    expect(transaction.startSpan).toHaveBeenCalledWith('build_api_docs.getPluginApiMap', 'setup');
  });
});
