/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { setupProject } from './setup_project';
import type { CliContext, CliOptions } from '../types';

// Mock dependencies - order matters: mock get_all_doc_file_ids first to prevent globby from loading
jest.mock('../../mdx/get_all_doc_file_ids', () => ({
  getAllDocFileIds: jest.fn(() => Promise.resolve([])),
}));
// Mock fs before @kbn/repo-info since it uses fs internally
// Use jest.requireActual to preserve all fs functions that globby needs
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    existsSync: jest.fn(() => false),
    readFileSync: jest.fn((path: string) => {
      // Return valid JSON for package.json paths
      if (path.includes('package.json')) {
        return JSON.stringify({ name: 'kibana', version: '1.0.0' });
      }
      return '{}';
    }),
    realpathSync: jest.fn((path: string) => path),
  };
});
jest.mock('@kbn/repo-info', () => ({
  REPO_ROOT: '/mock/repo/root',
}));
jest.mock('../../find_plugins');
jest.mock('../../get_paths_by_package');
jest.mock('fs/promises', () => ({
  rm: jest.fn(() => Promise.resolve()),
  mkdir: jest.fn(() => Promise.resolve()),
}));
// Mock ts-morph to avoid Node.js internals access issues in Jest
jest.mock('ts-morph', () => {
  const mockProject = {
    addSourceFilesAtPaths: jest.fn(),
    resolveSourceFileDependencies: jest.fn(),
  };
  return {
    Project: jest.fn(() => mockProject),
  };
});

import { findPlugins } from '../../find_plugins';
import { getPathsByPackage } from '../../get_paths_by_package';
import { getAllDocFileIds } from '../../mdx/get_all_doc_file_ids';

describe('setupProject', () => {
  let log: ToolingLog;
  let transaction: any;
  let context: CliContext;

  beforeEach(() => {
    log = new ToolingLog({
      level: 'silent',
      writeTo: process.stdout,
    });

    transaction = {
      startSpan: jest.fn(() => ({
        end: jest.fn(),
      })),
    };

    context = {
      log,
      transaction,
      outputFolder: Path.resolve(__dirname, '../../../../api_docs'),
    };

    (findPlugins as jest.Mock).mockReturnValue([]);
    (getPathsByPackage as jest.Mock).mockResolvedValue(new Map());
    (getAllDocFileIds as jest.Mock).mockResolvedValue([]);
  });

  it('returns setup result with plugins, paths, and project', async () => {
    const mockPlugins = [
      {
        id: 'test-plugin',
        directory: Path.resolve(__dirname, '../../../../src/plugins/test'),
        isPlugin: true,
        manifest: {
          id: 'test-plugin',
          owner: { name: 'test-team' },
          serviceFolders: [],
        },
        manifestPath: Path.resolve(__dirname, '../../../../src/plugins/test/kibana.json'),
      },
    ];

    (findPlugins as jest.Mock).mockReturnValue(mockPlugins);
    (getPathsByPackage as jest.Mock).mockResolvedValue(
      new Map([[mockPlugins[0], ['src/plugins/test/public/index.ts']]])
    );

    const options: CliOptions = {
      collectReferences: false,
    };

    const result = await setupProject(context, options);

    expect(result.plugins).toBeDefined();
    expect(result.pathsByPlugin).toBeDefined();
    expect(result.project).toBeDefined();
  });

  it('collects initial doc IDs when output folder exists and no plugin filter', async () => {
    const Fs = jest.requireMock('fs');
    Fs.existsSync.mockReturnValue(true);
    (getAllDocFileIds as jest.Mock).mockResolvedValue(['doc1', 'doc2']);

    const options: CliOptions = {
      collectReferences: false,
    };

    const result = await setupProject(context, options);

    expect(result.initialDocIds).toEqual(['doc1', 'doc2']);
  });

  it('does not collect initial doc IDs when plugin filter is provided', async () => {
    const Fs = jest.requireMock('fs');
    Fs.existsSync.mockReturnValue(true);

    const options: CliOptions = {
      collectReferences: false,
      pluginFilter: ['test-plugin'],
    };

    const result = await setupProject(context, options);

    expect(result.initialDocIds).toBeUndefined();
  });

  it('validates plugin filter and throws error if plugins not found', async () => {
    (findPlugins as jest.Mock).mockReturnValue([]);

    const options: CliOptions = {
      collectReferences: false,
      stats: ['any'],
      pluginFilter: ['nonexistent-plugin'],
    };

    await expect(setupProject(context, options)).rejects.toThrow('expected --plugin was not found');
  });
});
