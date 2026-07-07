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
import { writePluginDirectoryDoc } from './write_plugin_directory_doc';
import {
  createMockApiDeclaration,
  createMockPluginApi,
  createMockPluginMetaInfo,
} from '../__test_helpers__/mocks';

jest.mock('fs/promises');

const mockFsp = Fsp as jest.Mocked<typeof Fsp>;

const log = new ToolingLog({
  level: 'debug',
  writeTo: { write: () => {} },
});

describe('writePluginDirectoryDoc', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFsp.writeFile.mockResolvedValue(undefined);
  });

  it('writes plugin_directory.mdx file', async () => {
    const pluginApiMap = { testPlugin: createMockPluginApi() };
    const pluginStatsMap = { testPlugin: createMockPluginMetaInfo() };

    await writePluginDirectoryDoc('/output', pluginApiMap, pluginStatsMap, log);

    expect(mockFsp.writeFile).toHaveBeenCalledTimes(1);
    const [filePath] = mockFsp.writeFile.mock.calls[0];
    expect(filePath).toContain('plugin_directory.mdx');
  });

  it('includes overall stats section', async () => {
    const pluginApiMap = {
      pluginA: createMockPluginApi({ client: [createMockApiDeclaration()] }),
      pluginB: createMockPluginApi(),
    };
    const pluginStatsMap = {
      pluginA: createMockPluginMetaInfo({ apiCount: 5 }),
      pluginB: createMockPluginMetaInfo({ apiCount: 3 }),
    };

    await writePluginDirectoryDoc('/output', pluginApiMap, pluginStatsMap, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('### Overall stats');
    expect(content).toContain(
      '| Count | Plugins or Packages with a <br /> public API | Number of teams |'
    );
  });

  it('includes public API health stats section', async () => {
    const pluginApiMap = { testPlugin: createMockPluginApi() };
    const pluginStatsMap = {
      testPlugin: createMockPluginMetaInfo({
        apiCount: 10,
        isAnyType: [createMockApiDeclaration()],
        missingComments: [createMockApiDeclaration(), createMockApiDeclaration()],
        missingExports: 3,
      }),
    };

    await writePluginDirectoryDoc('/output', pluginApiMap, pluginStatsMap, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('### Public API health stats');
    expect(content).toContain('| API Count | Any Count | Missing comments | Missing exports |');
  });

  it('includes plugin directory section', async () => {
    const pluginApiMap = {
      testPlugin: createMockPluginApi({ client: [createMockApiDeclaration()] }),
    };
    const pluginStatsMap = {
      testPlugin: createMockPluginMetaInfo({ isPlugin: true }),
    };

    await writePluginDirectoryDoc('/output', pluginApiMap, pluginStatsMap, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('## Plugin Directory');
  });

  it('includes package directory section', async () => {
    const pluginApiMap = {
      '@kbn/test-package': createMockPluginApi({
        id: '@kbn/test-package',
        client: [createMockApiDeclaration()],
      }),
    };
    const pluginStatsMap = {
      '@kbn/test-package': createMockPluginMetaInfo({ isPlugin: false }),
    };

    await writePluginDirectoryDoc('/output', pluginApiMap, pluginStatsMap, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('## Package Directory');
  });

  it('counts unique teams', async () => {
    const pluginApiMap = {
      pluginA: createMockPluginApi(),
      pluginB: createMockPluginApi(),
      pluginC: createMockPluginApi(),
    };
    const pluginStatsMap = {
      pluginA: createMockPluginMetaInfo({ owner: { name: 'Team Alpha' } }),
      pluginB: createMockPluginMetaInfo({ owner: { name: 'Team Alpha' } }),
      pluginC: createMockPluginMetaInfo({ owner: { name: 'Team Beta' } }),
    };

    await writePluginDirectoryDoc('/output', pluginApiMap, pluginStatsMap, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    // Two unique teams.
    expect(content).toContain('| 3 |');
  });

  it('counts plugins with public API', async () => {
    const pluginApiMap = {
      pluginWithApi: createMockPluginApi({ client: [createMockApiDeclaration()] }),
      pluginWithoutApi: createMockPluginApi({ client: [], server: [], common: [] }),
    };
    const pluginStatsMap = {
      pluginWithApi: createMockPluginMetaInfo(),
      pluginWithoutApi: createMockPluginMetaInfo(),
    };

    await writePluginDirectoryDoc('/output', pluginApiMap, pluginStatsMap, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    // 2 total, 1 with public API.
    expect(content).toContain('| 2 | 1 |');
  });

  it('includes DocLinks for plugins with public API', async () => {
    const pluginApiMap = {
      testPlugin: createMockPluginApi({ client: [createMockApiDeclaration()] }),
    };
    const pluginStatsMap = {
      testPlugin: createMockPluginMetaInfo({ isPlugin: true }),
    };

    await writePluginDirectoryDoc('/output', pluginApiMap, pluginStatsMap, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('<DocLink id="');
    expect(content).toContain('text="testPlugin"');
  });

  it('shows plugin name without link when no public API', async () => {
    const pluginApiMap = {
      noApiPlugin: createMockPluginApi({ id: 'noApiPlugin', client: [], server: [], common: [] }),
    };
    const pluginStatsMap = {
      noApiPlugin: createMockPluginMetaInfo({ isPlugin: true }),
    };

    await writePluginDirectoryDoc('/output', pluginApiMap, pluginStatsMap, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('noApiPlugin');
    expect(content).not.toContain('<DocLink id="kibNoApiPluginPluginApi"');
  });

  it('includes team link when githubTeam is available', async () => {
    const pluginApiMap = {
      testPlugin: createMockPluginApi({ client: [createMockApiDeclaration()] }),
    };
    const pluginStatsMap = {
      testPlugin: createMockPluginMetaInfo({
        isPlugin: true,
        owner: { name: 'Test Team', githubTeam: 'test-team' },
      }),
    };

    await writePluginDirectoryDoc('/output', pluginApiMap, pluginStatsMap, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('[Test Team](https://github.com/orgs/elastic/teams/test-team)');
  });

  it('shows team name without link when githubTeam is not available', async () => {
    const pluginApiMap = {
      testPlugin: createMockPluginApi({ client: [createMockApiDeclaration()] }),
    };
    const pluginStatsMap = {
      testPlugin: createMockPluginMetaInfo({
        isPlugin: true,
        owner: { name: 'Test Team' },
      }),
    };

    await writePluginDirectoryDoc('/output', pluginApiMap, pluginStatsMap, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('Test Team');
    expect(content).not.toContain('https://github.com/orgs/elastic/teams/');
  });

  it('shows dash for plugins without description', async () => {
    const pluginApiMap = {
      testPlugin: createMockPluginApi({ client: [createMockApiDeclaration()] }),
    };
    const pluginStatsMap = {
      testPlugin: createMockPluginMetaInfo({
        isPlugin: true,
        description: undefined,
      }),
    };

    await writePluginDirectoryDoc('/output', pluginApiMap, pluginStatsMap, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('| - |');
  });

  it('sorts plugins alphabetically', async () => {
    const pluginApiMap = {
      zebra: createMockPluginApi({ id: 'zebra', client: [createMockApiDeclaration()] }),
      alpha: createMockPluginApi({ id: 'alpha', client: [createMockApiDeclaration()] }),
    };
    const pluginStatsMap = {
      zebra: createMockPluginMetaInfo({ isPlugin: true }),
      alpha: createMockPluginMetaInfo({ isPlugin: true }),
    };

    await writePluginDirectoryDoc('/output', pluginApiMap, pluginStatsMap, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    const alphaIndex = (content as string).indexOf('text="alpha"');
    const zebraIndex = (content as string).indexOf('text="zebra"');
    expect(alphaIndex).toBeLessThan(zebraIndex);
  });

  it('excludes packages without public API from package directory', async () => {
    const pluginApiMap = {
      '@kbn/no-api': createMockPluginApi({ id: '@kbn/no-api', client: [], server: [], common: [] }),
    };
    const pluginStatsMap = {
      '@kbn/no-api': createMockPluginMetaInfo({ isPlugin: false }),
    };

    await writePluginDirectoryDoc('/output', pluginApiMap, pluginStatsMap, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    // Package without API should not appear in the package table.
    const packageSection = (content as string).split('## Package Directory')[1];
    expect(packageSection).not.toContain('@kbn/no-api');
  });

  it('includes frontmatter with correct metadata', async () => {
    const pluginApiMap = {};
    const pluginStatsMap = {};

    await writePluginDirectoryDoc('/output', pluginApiMap, pluginStatsMap, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('id: kibDevDocsPluginDirectory');
    expect(content).toContain('slug: /kibana-dev-docs/api-meta/plugin-api-directory');
    expect(content).toContain('title: Directory');
  });

  it('includes stats for each plugin in the table', async () => {
    const pluginApiMap = {
      testPlugin: createMockPluginApi({ client: [createMockApiDeclaration()] }),
    };
    const pluginStatsMap = {
      testPlugin: createMockPluginMetaInfo({
        isPlugin: true,
        apiCount: 25,
        isAnyType: [createMockApiDeclaration()],
        missingComments: [createMockApiDeclaration(), createMockApiDeclaration()],
        missingExports: 3,
      }),
    };

    await writePluginDirectoryDoc('/output', pluginApiMap, pluginStatsMap, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    // The table row should contain stats.
    expect(content).toContain('| 25 |');
    expect(content).toContain('| 1 |');
    expect(content).toContain('| 2 |');
    expect(content).toContain('| 3 |');
  });
});
