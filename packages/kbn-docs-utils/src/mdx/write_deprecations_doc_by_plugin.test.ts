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
import { writeDeprecationDocByPlugin } from './write_deprecations_doc_by_plugin';
import type { ReferencedDeprecationsByPlugin, ApiDeclaration, ApiReference } from '../types';
import { createMockApiDeclaration, createMockReference } from '../__test_helpers__/mocks';

jest.mock('fs/promises');

const mockFsp = Fsp as jest.Mocked<typeof Fsp>;

const log = new ToolingLog({
  level: 'debug',
  writeTo: { write: () => {} },
});

describe('writeDeprecationDocByPlugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFsp.writeFile.mockResolvedValue(undefined);
  });

  it('writes deprecations_by_plugin.mdx file', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: [
        {
          deprecatedApi: createMockApiDeclaration({ id: 'api1', label: 'deprecatedFn' }),
          ref: createMockReference(),
        },
      ],
    };

    await writeDeprecationDocByPlugin('/output', deprecationsByPlugin, log);

    expect(mockFsp.writeFile).toHaveBeenCalledTimes(1);
    const [filePath] = mockFsp.writeFile.mock.calls[0];
    expect(filePath).toContain('deprecations_by_plugin.mdx');
  });

  it('creates section for each plugin', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: [
        {
          deprecatedApi: createMockApiDeclaration({ id: 'api1', label: 'deprecatedA' }),
          ref: createMockReference(),
        },
      ],
      pluginB: [
        {
          deprecatedApi: createMockApiDeclaration({ id: 'api2', label: 'deprecatedB' }),
          ref: createMockReference(),
        },
      ],
    };

    await writeDeprecationDocByPlugin('/output', deprecationsByPlugin, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('## pluginA');
    expect(content).toContain('## pluginB');
  });

  it('sorts plugins alphabetically', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      zebra: [
        {
          deprecatedApi: createMockApiDeclaration({ id: 'api1', label: 'zebraApi' }),
          ref: createMockReference(),
        },
      ],
      alpha: [
        {
          deprecatedApi: createMockApiDeclaration({ id: 'api2', label: 'alphaApi' }),
          ref: createMockReference(),
        },
      ],
    };

    await writeDeprecationDocByPlugin('/output', deprecationsByPlugin, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    const alphaIndex = (content as string).indexOf('## alpha');
    const zebraIndex = (content as string).indexOf('## zebra');
    expect(alphaIndex).toBeLessThan(zebraIndex);
  });

  it('includes table with deprecated API, references, and removeBy', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: [
        {
          deprecatedApi: createMockApiDeclaration({
            id: 'api1',
            label: 'deprecatedFn',
            removeBy: '9.0.0',
          }),
          ref: createMockReference({ path: 'src/plugins/a/file.ts' }),
        },
      ],
    };

    await writeDeprecationDocByPlugin('/output', deprecationsByPlugin, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('| Deprecated API | Reference location(s) | Remove By |');
    expect(content).toContain('deprecatedFn');
    expect(content).toContain('9.0.0');
  });

  it('groups references for the same deprecated API', async () => {
    const deprecatedApi = createMockApiDeclaration({ id: 'api1', label: 'sharedDeprecatedFn' });
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: [
        { deprecatedApi, ref: createMockReference({ path: 'src/plugins/a/file1.ts' }) },
        { deprecatedApi, ref: createMockReference({ path: 'src/plugins/a/file2.ts' }) },
      ],
    };

    await writeDeprecationDocByPlugin('/output', deprecationsByPlugin, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('file1.ts');
    expect(content).toContain('file2.ts');
  });

  it('shows dash when removeBy is not present', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: [
        {
          deprecatedApi: createMockApiDeclaration({
            id: 'api1',
            label: 'noDateApi',
            removeBy: undefined,
          }),
          ref: createMockReference(),
        },
      ],
    };

    await writeDeprecationDocByPlugin('/output', deprecationsByPlugin, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('| - |');
  });

  it('truncates references to first 10 and shows remaining count', async () => {
    const deprecatedApi = createMockApiDeclaration({ id: 'api1', label: 'popularApi' });
    const refs: Array<{ deprecatedApi: ApiDeclaration; ref: ApiReference }> = [];
    for (let i = 0; i < 15; i++) {
      refs.push({
        deprecatedApi,
        ref: createMockReference({ path: `src/plugins/a/file${i}.ts` }),
      });
    }

    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: refs,
    };

    await writeDeprecationDocByPlugin('/output', deprecationsByPlugin, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('+ 5 more');
  });

  it('creates GitHub links for reference locations', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: [
        {
          deprecatedApi: createMockApiDeclaration({ id: 'api1', label: 'linkedFn' }),
          ref: createMockReference({ path: 'src/plugins/a/specific_file.ts' }),
        },
      ],
    };

    await writeDeprecationDocByPlugin('/output', deprecationsByPlugin, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('https://github.com/elastic/kibana/tree/main/');
    expect(content).toContain('specific_file.ts');
  });

  it('includes DocLinks for deprecated APIs', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: [
        {
          deprecatedApi: createMockApiDeclaration({
            id: 'api1',
            label: 'linkedApi',
            parentPluginId: 'testPlugin',
          }),
          ref: createMockReference(),
        },
      ],
    };

    await writeDeprecationDocByPlugin('/output', deprecationsByPlugin, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('<DocLink id="');
    expect(content).toContain('section="api1"');
    expect(content).toContain('text="linkedApi"');
  });

  it('handles empty deprecations', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {};

    await writeDeprecationDocByPlugin('/output', deprecationsByPlugin, log);

    expect(mockFsp.writeFile).toHaveBeenCalled();
  });

  it('includes frontmatter with correct metadata', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {};

    await writeDeprecationDocByPlugin('/output', deprecationsByPlugin, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('id: kibDevDocsDeprecationsByPlugin');
    expect(content).toContain('slug: /kibana-dev-docs/api-meta/deprecated-api-list-by-plugin');
    expect(content).toContain('title: Deprecated API usage by plugin');
  });
});
