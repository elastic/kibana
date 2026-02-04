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
import { writeDeprecationDocByApi } from './write_deprecations_doc_by_api';
import type { ReferencedDeprecationsByPlugin, UnreferencedDeprecationsByPlugin } from '../types';
import { createMockApiDeclaration, createMockReference } from '../__test_helpers__/mocks';

jest.mock('fs/promises');

const mockFsp = Fsp as jest.Mocked<typeof Fsp>;

const log = new ToolingLog({
  level: 'debug',
  writeTo: { write: () => {} },
});

describe('writeDeprecationDocByApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFsp.writeFile.mockResolvedValue(undefined);
  });

  it('writes deprecations_by_api.mdx file', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: [
        {
          deprecatedApi: createMockApiDeclaration({ id: 'api1', label: 'deprecatedFn' }),
          ref: createMockReference(),
        },
      ],
    };
    const unReferencedDeprecations: UnreferencedDeprecationsByPlugin = {};

    await writeDeprecationDocByApi('/output', deprecationsByPlugin, unReferencedDeprecations, log);

    expect(mockFsp.writeFile).toHaveBeenCalledTimes(1);
    const [filePath] = mockFsp.writeFile.mock.calls[0];
    expect(filePath).toContain('deprecations_by_api.mdx');
  });

  it('includes referenced deprecated APIs section', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: [
        {
          deprecatedApi: createMockApiDeclaration({
            id: 'api1',
            label: 'deprecatedFn',
            references: [createMockReference()],
          }),
          ref: createMockReference(),
        },
      ],
    };
    const unReferencedDeprecations: UnreferencedDeprecationsByPlugin = {};

    await writeDeprecationDocByApi('/output', deprecationsByPlugin, unReferencedDeprecations, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('## Referenced deprecated APIs');
    expect(content).toContain('| Deprecated API | Referencing plugin(s) | Remove By |');
  });

  it('includes unreferenced deprecated APIs section', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {};
    const unReferencedDeprecations: UnreferencedDeprecationsByPlugin = {
      testPlugin: [createMockApiDeclaration({ id: 'unusedApi', label: 'unusedDeprecatedFn' })],
    };

    await writeDeprecationDocByApi('/output', deprecationsByPlugin, unReferencedDeprecations, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('## Unreferenced deprecated APIs');
    expect(content).toContain('Safe to remove');
    expect(content).toContain('unusedDeprecatedFn');
  });

  it('lists referencing plugins for each deprecated API', async () => {
    const deprecatedApi = createMockApiDeclaration({
      id: 'api1',
      label: 'sharedDeprecatedFn',
      references: [
        createMockReference({ plugin: 'pluginX' }),
        createMockReference({ plugin: 'pluginY' }),
      ],
    });

    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: [{ deprecatedApi, ref: createMockReference({ plugin: 'pluginX' }) }],
      pluginB: [{ deprecatedApi, ref: createMockReference({ plugin: 'pluginY' }) }],
    };
    const unReferencedDeprecations: UnreferencedDeprecationsByPlugin = {};

    await writeDeprecationDocByApi('/output', deprecationsByPlugin, unReferencedDeprecations, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('pluginX');
    expect(content).toContain('pluginY');
  });

  it('sorts deprecated APIs by removeBy date', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: [
        {
          deprecatedApi: createMockApiDeclaration({
            id: 'api1',
            label: 'laterRemoval',
            removeBy: '9.0.0',
          }),
          ref: createMockReference(),
        },
        {
          deprecatedApi: createMockApiDeclaration({
            id: 'api2',
            label: 'earlierRemoval',
            removeBy: '8.0.0',
          }),
          ref: createMockReference(),
        },
      ],
    };
    const unReferencedDeprecations: UnreferencedDeprecationsByPlugin = {};

    await writeDeprecationDocByApi('/output', deprecationsByPlugin, unReferencedDeprecations, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    const earlierIndex = (content as string).indexOf('earlierRemoval');
    const laterIndex = (content as string).indexOf('laterRemoval');
    expect(earlierIndex).toBeLessThan(laterIndex);
  });

  it('shows dash for APIs without removeBy date', async () => {
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
    const unReferencedDeprecations: UnreferencedDeprecationsByPlugin = {};

    await writeDeprecationDocByApi('/output', deprecationsByPlugin, unReferencedDeprecations, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('| - |');
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
    const unReferencedDeprecations: UnreferencedDeprecationsByPlugin = {};

    await writeDeprecationDocByApi('/output', deprecationsByPlugin, unReferencedDeprecations, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('<DocLink id="');
    expect(content).toContain('section="api1"');
    expect(content).toContain('text="linkedApi"');
  });

  it('handles empty deprecations', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {};
    const unReferencedDeprecations: UnreferencedDeprecationsByPlugin = {};

    await writeDeprecationDocByApi('/output', deprecationsByPlugin, unReferencedDeprecations, log);

    expect(mockFsp.writeFile).toHaveBeenCalled();
    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('## Referenced deprecated APIs');
    expect(content).toContain('## Unreferenced deprecated APIs');
  });

  it('includes frontmatter with correct metadata', async () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {};
    const unReferencedDeprecations: UnreferencedDeprecationsByPlugin = {};

    await writeDeprecationDocByApi('/output', deprecationsByPlugin, unReferencedDeprecations, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    expect(content).toContain('id: kibDevDocsDeprecationsByApi');
    expect(content).toContain('slug: /kibana-dev-docs/api-meta/deprecated-api-list-by-api');
    expect(content).toContain('title: Deprecated API usage by API');
  });

  it('deduplicates referencing plugins', async () => {
    const deprecatedApi = createMockApiDeclaration({
      id: 'api1',
      label: 'sharedApi',
      references: [
        createMockReference({ plugin: 'samePlugin' }),
        createMockReference({ plugin: 'samePlugin' }),
      ],
    });

    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: [
        { deprecatedApi, ref: createMockReference({ plugin: 'samePlugin' }) },
        { deprecatedApi, ref: createMockReference({ plugin: 'samePlugin' }) },
      ],
    };
    const unReferencedDeprecations: UnreferencedDeprecationsByPlugin = {};

    await writeDeprecationDocByApi('/output', deprecationsByPlugin, unReferencedDeprecations, log);

    const [, content] = mockFsp.writeFile.mock.calls[0];
    const matches = (content as string).match(/samePlugin/g);
    // Should only appear once in the table row (deduplicated).
    expect(matches?.length).toBeLessThanOrEqual(2);
  });
});
