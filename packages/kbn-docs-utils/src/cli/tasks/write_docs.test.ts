/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { writeDocs } from './write_docs';
import type {
  CliContext,
  CliOptions,
  SetupProjectResult,
  BuildApiMapResult,
  AllPluginStats,
} from '../types';

// Mock dependencies
jest.mock('../../mdx/write_plugin_mdx_docs');
jest.mock('../../mdx/write_deprecations_doc_by_api');
jest.mock('../../mdx/write_deprecations_doc_by_plugin');
jest.mock('../../mdx/write_plugin_directory_doc');
jest.mock('../../mdx/write_deprecations_due_by_team');
jest.mock('../../trim_deleted_docs_from_nav');

import { writePluginDocs } from '../../mdx/write_plugin_mdx_docs';
import { writeDeprecationDocByApi } from '../../mdx/write_deprecations_doc_by_api';
import { writeDeprecationDocByPlugin } from '../../mdx/write_deprecations_doc_by_plugin';
import { writePluginDirectoryDoc } from '../../mdx/write_plugin_directory_doc';
import { writeDeprecationDueByTeam } from '../../mdx/write_deprecations_due_by_team';
import { trimDeletedDocsFromNav } from '../../trim_deleted_docs_from_nav';

describe('writeDocs', () => {
  let context: CliContext;
  let setupResult: SetupProjectResult;
  let apiMapResult: BuildApiMapResult;
  let allPluginStats: AllPluginStats;

  beforeEach(() => {
    const mockPlugin = {
      id: 'test-plugin',
      directory: 'src/plugins/test',
      isPlugin: true,
      manifest: {
        id: 'test-plugin',
        owner: { name: 'test-team' },
        serviceFolders: [],
      },
      manifestPath: 'src/plugins/test/kibana.json',
    };

    context = {
      log: new ToolingLog({
        level: 'silent',
        writeTo: process.stdout,
      }),
      transaction: {
        startSpan: jest.fn(() => ({
          end: jest.fn(),
        })),
      } as any,
      outputFolder: '/tmp/api_docs',
    };

    setupResult = {
      plugins: [mockPlugin],
      pathsByPlugin: new Map(),
      project: {} as any,
      initialDocIds: ['doc1', 'doc2'],
    };

    apiMapResult = {
      pluginApiMap: {
        'test-plugin': {
          id: 'test-plugin',
          client: [],
          server: [],
          common: [],
        },
      },
      missingApiItems: {},
      referencedDeprecations: {},
      unreferencedDeprecations: {},
      adoptionTrackedAPIs: {},
    };

    allPluginStats = {
      'test-plugin': {
        apiCount: 5,
        missingComments: [],
        isAnyType: [],
        noReferences: [],
        missingExports: 0,
        deprecatedAPIsReferencedCount: 0,
        unreferencedDeprecatedApisCount: 0,
        adoptionTrackedAPIs: [],
        adoptionTrackedAPIsCount: 0,
        adoptionTrackedAPIsUnreferencedCount: 0,
        owner: { name: 'test-team' },
        description: 'Test plugin',
        isPlugin: true,
        eslintDisableLineCount: 0,
        eslintDisableFileCount: 0,
        enzymeImportCount: 0,
      },
    };

    // Clear all mocks before each test
    jest.clearAllMocks();

    // Set up mock implementations
    (writePluginDocs as jest.Mock).mockResolvedValue(undefined);
    (writeDeprecationDocByApi as jest.Mock).mockResolvedValue(undefined);
    (writeDeprecationDocByPlugin as jest.Mock).mockResolvedValue(undefined);
    (writePluginDirectoryDoc as jest.Mock).mockResolvedValue(undefined);
    (writeDeprecationDueByTeam as jest.Mock).mockResolvedValue(undefined);
    (trimDeletedDocsFromNav as jest.Mock).mockResolvedValue(undefined);
  });

  it('skips writing plugin directory doc when stats is provided', async () => {
    const options: CliOptions = {
      collectReferences: false,
      stats: ['any'],
    };

    await writeDocs(context, setupResult, apiMapResult, allPluginStats, options);

    expect(writePluginDirectoryDoc).not.toHaveBeenCalled();
  });

  it('writes plugin directory doc when stats is not provided', async () => {
    const options: CliOptions = {
      collectReferences: false,
    };

    await writeDocs(context, setupResult, apiMapResult, allPluginStats, options);

    expect(writePluginDirectoryDoc).toHaveBeenCalled();
  });

  it('writes plugin docs when stats is not provided', async () => {
    const options: CliOptions = {
      collectReferences: false,
    };

    await writeDocs(context, setupResult, apiMapResult, allPluginStats, options);

    expect(writePluginDocs).toHaveBeenCalled();
  });

  it('trims deleted docs from nav when initialDocIds are provided', async () => {
    const options: CliOptions = {
      collectReferences: false,
    };

    await writeDocs(context, setupResult, apiMapResult, allPluginStats, options);

    expect(trimDeletedDocsFromNav).toHaveBeenCalledWith(
      context.log,
      setupResult.initialDocIds,
      context.outputFolder
    );
  });
});
