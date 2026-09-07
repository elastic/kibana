/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fsp from 'fs/promises';
import { ToolingLog } from '@kbn/tooling-log';
import { writePluginDocs, writePluginDoc } from './write_plugin_mdx_docs';
import { TypeKind } from '../types';
import {
  createMockApiDeclaration,
  createMockPlugin,
  createMockPluginStats,
  createMockPluginApi,
} from '../__test_helpers__/mocks';

jest.mock('fs/promises');
jest.mock('./write_plugin_split_by_folder', () => ({
  writePluginDocSplitByFolder: jest.fn().mockResolvedValue(undefined),
}));

const mockFsp = Fsp as jest.Mocked<typeof Fsp>;

const log = new ToolingLog({
  level: 'debug',
  writeTo: { write: () => {} },
});

describe('writePluginMdxDocs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFsp.writeFile.mockResolvedValue(undefined);
  });

  describe('writePluginDocs', () => {
    it('calls writePluginDocSplitByFolder when serviceFolders is defined', async () => {
      const { writePluginDocSplitByFolder } = await import('./write_plugin_split_by_folder');

      const doc = createMockPluginApi({
        serviceFolders: ['service_a'],
        client: [createMockApiDeclaration()],
      });

      await writePluginDocs('/output', {
        doc,
        plugin: createMockPlugin(),
        pluginStats: createMockPluginStats(),
        log,
      });

      expect(writePluginDocSplitByFolder).toHaveBeenCalledWith('/output', expect.any(Object));
    });

    it('calls writePluginDoc when serviceFolders is not defined', async () => {
      const doc = createMockPluginApi({
        client: [createMockApiDeclaration()],
      });

      await writePluginDocs('/output', {
        doc,
        plugin: createMockPlugin(),
        pluginStats: createMockPluginStats(),
        log,
      });

      expect(mockFsp.writeFile).toHaveBeenCalled();
    });
  });

  describe('writePluginDoc', () => {
    it('skips plugins without public API', async () => {
      const doc = createMockPluginApi({
        client: [],
        server: [],
        common: [],
      });

      await writePluginDoc('/output', {
        doc,
        plugin: createMockPlugin(),
        pluginStats: createMockPluginStats(),
        log,
      });

      expect(mockFsp.writeFile).not.toHaveBeenCalled();
    });

    it('writes mdx file for plugin with client API', async () => {
      const doc = createMockPluginApi({
        client: [createMockApiDeclaration()],
      });

      await writePluginDoc('/output', {
        doc,
        plugin: createMockPlugin(),
        pluginStats: createMockPluginStats(),
        log,
      });

      expect(mockFsp.writeFile).toHaveBeenCalledTimes(2);
      const [jsonPath, jsonContent] = mockFsp.writeFile.mock.calls[0];
      expect(jsonPath).toContain('.devdocs.json');
      expect(JSON.parse(jsonContent as string)).toBeDefined();

      const [mdxPath, mdxContent] = mockFsp.writeFile.mock.calls[1];
      expect(mdxPath).toContain('.mdx');
      expect(mdxContent).toContain('## Client');
    });

    it('writes mdx file for plugin with server API', async () => {
      const doc = createMockPluginApi({
        server: [createMockApiDeclaration()],
      });

      await writePluginDoc('/output', {
        doc,
        plugin: createMockPlugin(),
        pluginStats: createMockPluginStats(),
        log,
      });

      const [, mdxContent] = mockFsp.writeFile.mock.calls[1];
      expect(mdxContent).toContain('## Server');
    });

    it('writes mdx file for plugin with common API', async () => {
      const doc = createMockPluginApi({
        common: [createMockApiDeclaration()],
      });

      await writePluginDoc('/output', {
        doc,
        plugin: createMockPlugin(),
        pluginStats: createMockPluginStats(),
        log,
      });

      const [, mdxContent] = mockFsp.writeFile.mock.calls[1];
      expect(mdxContent).toContain('## Common');
    });

    it('includes team contact info when githubTeam is available', async () => {
      const doc = createMockPluginApi({
        client: [createMockApiDeclaration()],
      });

      await writePluginDoc('/output', {
        doc,
        plugin: createMockPlugin({
          manifest: {
            id: 'testPlugin',
            description: 'A test plugin',
            owner: { name: 'Test Team', githubTeam: 'test-team' },
            serviceFolders: [],
          },
        }),
        pluginStats: createMockPluginStats(),
        log,
      });

      const [, mdxContent] = mockFsp.writeFile.mock.calls[1];
      expect(mdxContent).toContain('Contact [Test Team]');
      expect(mdxContent).toContain('https://github.com/orgs/elastic/teams/test-team');
    });

    it('includes team name without link when githubTeam is not available', async () => {
      const doc = createMockPluginApi({
        client: [createMockApiDeclaration()],
      });

      await writePluginDoc('/output', {
        doc,
        plugin: createMockPlugin({
          manifest: {
            id: 'testPlugin',
            description: 'A test plugin',
            owner: { name: 'Test Team' },
            serviceFolders: [],
          },
        }),
        pluginStats: createMockPluginStats(),
        log,
      });

      const [, mdxContent] = mockFsp.writeFile.mock.calls[1];
      expect(mdxContent).toContain('Contact Test Team');
      expect(mdxContent).not.toContain('https://github.com/orgs/elastic/teams/');
    });

    it('includes code health stats in the mdx output', async () => {
      const doc = createMockPluginApi({
        client: [createMockApiDeclaration()],
      });

      await writePluginDoc('/output', {
        doc,
        plugin: createMockPlugin(),
        pluginStats: createMockPluginStats({
          apiCount: 25,
          isAnyType: [createMockApiDeclaration()],
          missingComments: [createMockApiDeclaration(), createMockApiDeclaration()],
          missingExports: 3,
        }),
        log,
      });

      const [, mdxContent] = mockFsp.writeFile.mock.calls[1];
      expect(mdxContent).toContain('**Code health stats**');
      expect(mdxContent).toContain('| 25 | 1 | 2 | 3 |');
    });

    it('includes setup section when present', async () => {
      const doc = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'setup',
            label: 'Setup',
          }),
        ],
      });

      await writePluginDoc('/output', {
        doc,
        plugin: createMockPlugin(),
        pluginStats: createMockPluginStats(),
        log,
      });

      expect(mockFsp.writeFile).toHaveBeenCalled();
    });

    it('includes interfaces section when present', async () => {
      const doc = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            type: TypeKind.InterfaceKind,
          }),
        ],
      });

      await writePluginDoc('/output', {
        doc,
        plugin: createMockPlugin(),
        pluginStats: createMockPluginStats(),
        log,
      });

      const [, mdxContent] = mockFsp.writeFile.mock.calls[1];
      expect(mdxContent).toContain('### Interfaces');
    });

    it('includes classes section when present', async () => {
      const doc = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            type: TypeKind.ClassKind,
          }),
        ],
      });

      await writePluginDoc('/output', {
        doc,
        plugin: createMockPlugin(),
        pluginStats: createMockPluginStats(),
        log,
      });

      const [, mdxContent] = mockFsp.writeFile.mock.calls[1];
      expect(mdxContent).toContain('### Classes');
    });

    it('includes enums section when present', async () => {
      const doc = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            type: TypeKind.EnumKind,
          }),
        ],
      });

      await writePluginDoc('/output', {
        doc,
        plugin: createMockPlugin(),
        pluginStats: createMockPluginStats(),
        log,
      });

      const [, mdxContent] = mockFsp.writeFile.mock.calls[1];
      expect(mdxContent).toContain('### Enums');
    });

    it('includes objects section when present', async () => {
      const doc = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            type: TypeKind.ObjectKind,
          }),
        ],
      });

      await writePluginDoc('/output', {
        doc,
        plugin: createMockPlugin(),
        pluginStats: createMockPluginStats(),
        log,
      });

      const [, mdxContent] = mockFsp.writeFile.mock.calls[1];
      expect(mdxContent).toContain('### Objects');
    });

    it('includes misc section for uncategorized types', async () => {
      const doc = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            type: TypeKind.StringKind,
          }),
        ],
      });

      await writePluginDoc('/output', {
        doc,
        plugin: createMockPlugin(),
        pluginStats: createMockPluginStats(),
        log,
      });

      const [, mdxContent] = mockFsp.writeFile.mock.calls[1];
      expect(mdxContent).toContain('### Consts, variables and types');
    });

    it('handles @kbn package names correctly', async () => {
      const doc = createMockPluginApi({
        id: '@kbn/some-package',
        client: [createMockApiDeclaration()],
      });

      await writePluginDoc('/output', {
        doc,
        plugin: createMockPlugin({ id: '@kbn/some-package' }),
        pluginStats: createMockPluginStats(),
        log,
      });

      const [jsonPath] = mockFsp.writeFile.mock.calls[0];
      expect(jsonPath).toContain('kbn_some_package');
    });
  });
});
