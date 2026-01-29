/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { buildPluginDeprecationsTable } from './build_plugin_deprecations_table';
import type { ReferencedDeprecationsByPlugin, ApiDeclaration, ApiReference } from '../types';
import { createMockApiDeclaration, createMockReference } from '../__test_helpers__/mocks';

const log = new ToolingLog({
  level: 'debug',
  writeTo: { write: () => {} },
});

describe('buildPluginDeprecationsTable', () => {
  it('returns empty string for empty deprecations', () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {};

    const result = buildPluginDeprecationsTable(deprecationsByPlugin, log);

    expect(result).toBe('');
  });

  it('builds table with single plugin deprecation', () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: [
        {
          deprecatedApi: createMockApiDeclaration({ id: 'api1', label: 'deprecatedFn' }),
          ref: createMockReference(),
        },
      ],
    };

    const result = buildPluginDeprecationsTable(deprecationsByPlugin, log);

    expect(result).toContain('## pluginA');
    expect(result).toContain('| Deprecated API | Reference location(s) | Remove By |');
    expect(result).toContain('deprecatedFn');
  });

  it('groups multiple references to the same deprecated API', () => {
    const deprecatedApi = createMockApiDeclaration({ id: 'api1', label: 'sharedDeprecatedFn' });
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: [
        { deprecatedApi, ref: createMockReference({ path: 'src/plugins/a/file1.ts' }) },
        { deprecatedApi, ref: createMockReference({ path: 'src/plugins/a/file2.ts' }) },
      ],
    };

    const result = buildPluginDeprecationsTable(deprecationsByPlugin, log);

    expect(result).toContain('sharedDeprecatedFn');
    expect(result).toContain('file1.ts');
    expect(result).toContain('file2.ts');
  });

  it('includes removeBy date when present', () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: [
        {
          deprecatedApi: createMockApiDeclaration({
            id: 'api1',
            label: 'deprecatedWithDate',
            removeBy: '9.0.0',
          }),
          ref: createMockReference(),
        },
      ],
    };

    const result = buildPluginDeprecationsTable(deprecationsByPlugin, log);

    expect(result).toContain('9.0.0');
  });

  it('shows dash when removeBy is not present', () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: [
        {
          deprecatedApi: createMockApiDeclaration({
            id: 'api1',
            label: 'deprecatedNoDate',
            removeBy: undefined,
          }),
          ref: createMockReference(),
        },
      ],
    };

    const result = buildPluginDeprecationsTable(deprecationsByPlugin, log);

    expect(result).toContain('| - |');
  });

  it('sorts plugins alphabetically', () => {
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

    const result = buildPluginDeprecationsTable(deprecationsByPlugin, log);

    const alphaIndex = result.indexOf('## alpha');
    const zebraIndex = result.indexOf('## zebra');
    expect(alphaIndex).toBeLessThan(zebraIndex);
  });

  it('includes DocLink with correct plugin API doc ID', () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: [
        {
          deprecatedApi: createMockApiDeclaration({
            id: 'api1',
            label: 'myDeprecatedFn',
            parentPluginId: 'testPlugin',
          }),
          ref: createMockReference(),
        },
      ],
    };

    const result = buildPluginDeprecationsTable(deprecationsByPlugin, log);

    expect(result).toContain('<DocLink id="');
    expect(result).toContain('section="api1"');
    expect(result).toContain('text="myDeprecatedFn"');
  });

  it('truncates references to first 10 and shows count of remaining', () => {
    const deprecatedApi = createMockApiDeclaration({ id: 'api1', label: 'popularDeprecatedFn' });
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

    const result = buildPluginDeprecationsTable(deprecationsByPlugin, log);

    expect(result).toContain('+ 5 more');
  });

  it('creates GitHub links for reference locations', () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: [
        {
          deprecatedApi: createMockApiDeclaration({ id: 'api1', label: 'linkedFn' }),
          ref: createMockReference({ path: 'src/plugins/a/specific_file.ts' }),
        },
      ],
    };

    const result = buildPluginDeprecationsTable(deprecationsByPlugin, log);

    expect(result).toContain('https://github.com/elastic/kibana/tree/main/');
    expect(result).toContain('specific_file.ts');
  });

  it('handles multiple plugins with multiple deprecations', () => {
    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: [
        {
          deprecatedApi: createMockApiDeclaration({ id: 'api1', label: 'deprecatedA1' }),
          ref: createMockReference(),
        },
        {
          deprecatedApi: createMockApiDeclaration({ id: 'api2', label: 'deprecatedA2' }),
          ref: createMockReference(),
        },
      ],
      pluginB: [
        {
          deprecatedApi: createMockApiDeclaration({ id: 'api3', label: 'deprecatedB1' }),
          ref: createMockReference(),
        },
      ],
    };

    const result = buildPluginDeprecationsTable(deprecationsByPlugin, log);

    expect(result).toContain('## pluginA');
    expect(result).toContain('## pluginB');
    expect(result).toContain('deprecatedA1');
    expect(result).toContain('deprecatedA2');
    expect(result).toContain('deprecatedB1');
  });

  it('does not mutate the input deprecationsByPlugin object', () => {
    const deprecatedApi = createMockApiDeclaration({ id: 'api1', label: 'mutationTest' });
    const originalRefs = Array.from({ length: 15 }, (_, i) => ({
      deprecatedApi,
      ref: createMockReference({ path: `src/plugins/a/file${i}.ts` }),
    }));

    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: [...originalRefs],
    };

    const beforeLength = deprecationsByPlugin.pluginA.length;
    buildPluginDeprecationsTable(deprecationsByPlugin, log);

    expect(deprecationsByPlugin.pluginA).toHaveLength(beforeLength);
  });

  it('shows all references without truncation message when exactly 10 exist', () => {
    const deprecatedApi = createMockApiDeclaration({ id: 'api1', label: 'exactlyTenFn' });
    const refs: Array<{ deprecatedApi: ApiDeclaration; ref: ApiReference }> = Array.from(
      { length: 10 },
      (_, i) => ({
        deprecatedApi,
        ref: createMockReference({ path: `src/plugins/a/file${i}.ts` }),
      })
    );

    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: refs,
    };

    const result = buildPluginDeprecationsTable(deprecationsByPlugin, log);

    expect(result).not.toContain('+ 0 more');
    expect(result).not.toContain('more');
    expect(result).toContain('file9.ts');
  });

  it('shows all references without truncation message when fewer than 10 exist', () => {
    const deprecatedApi = createMockApiDeclaration({ id: 'api1', label: 'fewRefsFn' });
    const refs: Array<{ deprecatedApi: ApiDeclaration; ref: ApiReference }> = Array.from(
      { length: 5 },
      (_, i) => ({
        deprecatedApi,
        ref: createMockReference({ path: `src/plugins/a/file${i}.ts` }),
      })
    );

    const deprecationsByPlugin: ReferencedDeprecationsByPlugin = {
      pluginA: refs,
    };

    const result = buildPluginDeprecationsTable(deprecationsByPlugin, log);

    expect(result).not.toContain('more');
    expect(result).toContain('file0.ts');
    expect(result).toContain('file4.ts');
  });
});
