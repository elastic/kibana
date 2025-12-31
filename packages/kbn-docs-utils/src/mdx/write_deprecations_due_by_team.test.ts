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
import { writeDeprecationDueByTeam } from './write_deprecations_due_by_team';
import type {
  ReferencedDeprecationsByPlugin,
  PluginOrPackage,
  ApiDeclaration,
  ApiReference,
} from '../types';
import {
  createMockApiDeclaration,
  createMockReference,
  createMockPlugin,
} from '../__test_helpers__/mocks';

jest.mock('fs/promises');

const mockFsp = Fsp as jest.Mocked<typeof Fsp>;

const log = new ToolingLog({
  level: 'debug',
  writeTo: { write: () => {} },
});

describe('writeDeprecationDueByTeam', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFsp.writeFile.mockResolvedValue(undefined);
  });

  it('writes deprecations_by_team.mdx file', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      testPlugin: [
        {
          deprecatedApi: createMockApiDeclaration({
            id: 'api1',
            label: 'deprecatedFn',
            removeBy: '9.0.0',
          }),
          ref: createMockReference(),
        },
      ],
    };
    const plugins = [createMockPlugin()];

    await writeDeprecationDueByTeam('/output', deprecationsByPlugin, plugins, log);

    expect(mockFsp.writeFile).toHaveBeenCalledTimes(1);
    const [filePath] = mockFsp.writeFile.mock.calls[0];
    expect(filePath).toContain('deprecations_by_team.mdx');
  });

  it('groups deprecations by team', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: [
        {
          deprecatedApi: createMockApiDeclaration({
            id: 'api1',
            label: 'deprecatedA',
            removeBy: '9.0.0',
          }),
          ref: createMockReference(),
        },
      ],
      pluginB: [
        {
          deprecatedApi: createMockApiDeclaration({
            id: 'api2',
            label: 'deprecatedB',
            removeBy: '9.0.0',
          }),
          ref: createMockReference(),
        },
      ],
    };
    const plugins = [
      createMockPlugin({
        id: 'pluginA',
        manifest: {
          id: 'pluginA',
          owner: { name: 'Team Alpha' },
          serviceFolders: [],
        },
      }),
      createMockPlugin({
        id: 'pluginB',
        manifest: {
          id: 'pluginB',
          owner: { name: 'Team Alpha' },
          serviceFolders: [],
        },
      }),
    ];

    await writeDeprecationDueByTeam('/output', deprecationsByPlugin, plugins, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('## Team Alpha');
    expect(content).toContain('deprecatedA');
    expect(content).toContain('deprecatedB');
  });

  it('only includes deprecations with removeBy date', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      testPlugin: [
        {
          deprecatedApi: createMockApiDeclaration({
            id: 'api1',
            label: 'withDate',
            removeBy: '9.0.0',
          }),
          ref: createMockReference(),
        },
        {
          deprecatedApi: createMockApiDeclaration({
            id: 'api2',
            label: 'withoutDate',
            removeBy: undefined,
          }),
          ref: createMockReference(),
        },
      ],
    };
    const plugins = [createMockPlugin()];

    await writeDeprecationDueByTeam('/output', deprecationsByPlugin, plugins, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('withDate');
    expect(content).not.toContain('withoutDate');
  });

  it('skips plugins without owner name', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      testPlugin: [
        {
          deprecatedApi: createMockApiDeclaration({
            id: 'api1',
            label: 'deprecatedFn',
            removeBy: '9.0.0',
          }),
          ref: createMockReference(),
        },
      ],
    };
    const plugins = [
      createMockPlugin({
        manifest: {
          id: 'testPlugin',
          owner: { name: '' },
          serviceFolders: [],
        },
      }),
    ];

    await writeDeprecationDueByTeam('/output', deprecationsByPlugin, plugins, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).not.toContain('deprecatedFn');
  });

  it('skips plugins not found in plugins list', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      unknownPlugin: [
        {
          deprecatedApi: createMockApiDeclaration({
            id: 'api1',
            label: 'unknownApi',
            removeBy: '9.0.0',
          }),
          ref: createMockReference(),
        },
      ],
    };
    const plugins = [createMockPlugin({ id: 'differentPlugin' })];

    await writeDeprecationDueByTeam('/output', deprecationsByPlugin, plugins, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).not.toContain('unknownApi');
  });

  it('sorts teams alphabetically', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginZ: [
        {
          deprecatedApi: createMockApiDeclaration({
            id: 'api1',
            label: 'zebraApi',
            removeBy: '9.0.0',
          }),
          ref: createMockReference(),
        },
      ],
      pluginA: [
        {
          deprecatedApi: createMockApiDeclaration({
            id: 'api2',
            label: 'alphaApi',
            removeBy: '9.0.0',
          }),
          ref: createMockReference(),
        },
      ],
    };
    const plugins = [
      createMockPlugin({
        id: 'pluginZ',
        manifest: { id: 'pluginZ', owner: { name: 'Zebra Team' }, serviceFolders: [] },
      }),
      createMockPlugin({
        id: 'pluginA',
        manifest: { id: 'pluginA', owner: { name: 'Alpha Team' }, serviceFolders: [] },
      }),
    ];

    await writeDeprecationDueByTeam('/output', deprecationsByPlugin, plugins, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    const alphaIndex = (content as string).indexOf('## Alpha Team');
    const zebraIndex = (content as string).indexOf('## Zebra Team');
    expect(alphaIndex).toBeLessThan(zebraIndex);
  });

  it('includes table with plugin, API, references, and removeBy', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      testPlugin: [
        {
          deprecatedApi: createMockApiDeclaration({
            id: 'api1',
            label: 'deprecatedFn',
            removeBy: '9.0.0',
          }),
          ref: createMockReference({ plugin: 'consumerPlugin' }),
        },
      ],
    };
    const plugins = [createMockPlugin()];

    await writeDeprecationDueByTeam('/output', deprecationsByPlugin, plugins, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('| Plugin | Deprecated API | Reference location(s) | Remove By |');
    expect(content).toContain('consumerPlugin');
    expect(content).toContain('deprecatedFn');
    expect(content).toContain('9.0.0');
  });

  it('truncates references to first 10 and shows remaining count', async () => {
    const deprecatedApi = createMockApiDeclaration({
      id: 'api1',
      label: 'popularApi',
      removeBy: '9.0.0',
    });
    const refs: Array<{ deprecatedApi: ApiDeclaration; ref: ApiReference }> = [];
    for (let i = 0; i < 15; i++) {
      refs.push({
        deprecatedApi,
        ref: createMockReference({ path: `src/plugins/a/file${i}.ts` }),
      });
    }

    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      testPlugin: refs,
    };
    const plugins = [createMockPlugin()];

    await writeDeprecationDueByTeam('/output', deprecationsByPlugin, plugins, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('+ 5 more');
  });

  it('creates GitHub links for reference locations', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      testPlugin: [
        {
          deprecatedApi: createMockApiDeclaration({
            id: 'api1',
            label: 'linkedFn',
            removeBy: '9.0.0',
          }),
          ref: createMockReference({ path: 'src/plugins/a/specific_file.ts' }),
        },
      ],
    };
    const plugins = [createMockPlugin()];

    await writeDeprecationDueByTeam('/output', deprecationsByPlugin, plugins, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('https://github.com/elastic/kibana/tree/main/');
    expect(content).toContain('specific_file.ts');
  });

  it('handles empty deprecations', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {};
    const plugins: PluginOrPackage[] = [];

    await writeDeprecationDueByTeam('/output', deprecationsByPlugin, plugins, log);

    expect(mockFsp.writeFile).toHaveBeenCalled();
  });

  it('includes frontmatter with correct metadata', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {};
    const plugins: PluginOrPackage[] = [];

    await writeDeprecationDueByTeam('/output', deprecationsByPlugin, plugins, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('id: kibDevDocsDeprecationsDueByTeam');
    expect(content).toContain('slug: /kibana-dev-docs/api-meta/deprecations-due-by-team');
    expect(content).toContain('title: Deprecated APIs due to be removed, by team');
  });

  it('skips deprecated APIs with no references', async () => {
    const deprecatedApi = createMockApiDeclaration({
      id: 'api1',
      label: 'noRefsApi',
      removeBy: '9.0.0',
    });
    // Create a scenario where refs array is empty after grouping.
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      testPlugin: [{ deprecatedApi, ref: createMockReference() }],
    };
    const plugins = [createMockPlugin()];

    await writeDeprecationDueByTeam('/output', deprecationsByPlugin, plugins, log);

    // The API should be included since it has at least one reference.
    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('noRefsApi');
  });
});
