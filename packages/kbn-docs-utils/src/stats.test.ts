/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AdoptionTrackedAPIsByPlugin,
  ApiDeclaration,
  ApiReference,
  IssuesByPlugin,
  MissingApiItemMap,
  PluginApi,
  ReferencedDeprecationsByPlugin,
} from './types';
import { TypeKind } from './types';
import { collectApiStatsForPlugin } from './stats';

const createEmptyIssues = (): IssuesByPlugin => ({
  missingApiItems: {},
  referencedDeprecations: {},
  adoptionTrackedAPIs: {},
});

const createMockApiDeclaration = (overrides: Partial<ApiDeclaration> = {}): ApiDeclaration => ({
  id: 'test-id',
  label: 'test-label',
  type: TypeKind.StringKind,
  path: 'src/test/file.ts',
  parentPluginId: 'test-plugin',
  ...overrides,
});

const createMockPluginApi = (overrides: Partial<PluginApi> = {}): PluginApi => ({
  id: 'test-plugin',
  client: [],
  server: [],
  common: [],
  ...overrides,
});

describe('collectApiStatsForPlugin', () => {
  describe('missing comments detection', () => {
    it('flags API declarations without descriptions', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'no-comment',
            label: 'noComment',
            description: undefined,
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.missingComments).toHaveLength(1);
      expect(stats.missingComments[0].id).toBe('no-comment');
    });

    it('flags API declarations with empty description arrays', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'empty-comment',
            label: 'emptyComment',
            description: [],
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.missingComments).toHaveLength(1);
      expect(stats.missingComments[0].id).toBe('empty-comment');
    });

    it('does not flag API declarations with descriptions', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'with-comment',
            label: 'withComment',
            description: ['This has a description'],
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.missingComments).toHaveLength(0);
    });

    it('recursively checks children for missing comments', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'parent',
            label: 'parent',
            description: ['Parent has comment'],
            children: [
              createMockApiDeclaration({
                id: 'child-no-comment',
                label: 'childNoComment',
                description: undefined,
              }),
              createMockApiDeclaration({
                id: 'child-with-comment',
                label: 'childWithComment',
                description: ['Child has comment'],
              }),
            ],
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.missingComments).toHaveLength(1);
      expect(stats.missingComments[0].id).toBe('child-no-comment');
    });

    it('handles deeply nested children', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'level1',
            label: 'level1',
            description: ['Level 1'],
            children: [
              createMockApiDeclaration({
                id: 'level2',
                label: 'level2',
                description: ['Level 2'],
                children: [
                  createMockApiDeclaration({
                    id: 'level3-no-comment',
                    label: 'level3NoComment',
                    description: undefined,
                  }),
                ],
              }),
            ],
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.missingComments).toHaveLength(1);
      expect(stats.missingComments[0].id).toBe('level3-no-comment');
    });

    it('checks all scopes (client, server, common)', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'client-no-comment',
            description: undefined,
          }),
        ],
        server: [
          createMockApiDeclaration({
            id: 'server-no-comment',
            description: undefined,
          }),
        ],
        common: [
          createMockApiDeclaration({
            id: 'common-no-comment',
            description: undefined,
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.missingComments).toHaveLength(3);
      expect(stats.missingComments.map((d) => d.id)).toEqual([
        'client-no-comment',
        'server-no-comment',
        'common-no-comment',
      ]);
    });

    it('ignores node_modules paths', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'node-modules-api',
            label: 'nodeModulesApi',
            description: undefined,
            path: 'node_modules/some-package/index.ts',
          }),
          createMockApiDeclaration({
            id: 'regular-api',
            label: 'regularApi',
            description: undefined,
            path: 'src/plugin/file.ts',
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      // Should only flag the regular API, not the node_modules one
      expect(stats.missingComments).toHaveLength(1);
      expect(stats.missingComments[0].id).toBe('regular-api');
    });
  });

  describe('any type detection', () => {
    it('flags API declarations with AnyKind type', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'any-type',
            label: 'anyType',
            type: TypeKind.AnyKind,
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.isAnyType).toHaveLength(1);
      expect(stats.isAnyType[0].id).toBe('any-type');
    });

    it('does not flag non-any types', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'string-type',
            type: TypeKind.StringKind,
          }),
          createMockApiDeclaration({
            id: 'number-type',
            type: TypeKind.NumberKind,
          }),
          createMockApiDeclaration({
            id: 'unknown-type',
            type: TypeKind.UnknownKind,
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.isAnyType).toHaveLength(0);
    });

    it('recursively checks children for any types', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'parent',
            type: TypeKind.ObjectKind,
            children: [
              createMockApiDeclaration({
                id: 'child-any',
                type: TypeKind.AnyKind,
              }),
            ],
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.isAnyType).toHaveLength(1);
      expect(stats.isAnyType[0].id).toBe('child-any');
    });

    it('checks all scopes for any types', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'client-any',
            type: TypeKind.AnyKind,
          }),
        ],
        server: [
          createMockApiDeclaration({
            id: 'server-any',
            type: TypeKind.AnyKind,
          }),
        ],
        common: [
          createMockApiDeclaration({
            id: 'common-any',
            type: TypeKind.AnyKind,
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.isAnyType).toHaveLength(3);
    });
  });

  describe('missing exports detection', () => {
    it('counts missing exports from missingApiItems', () => {
      const missingApiItems: MissingApiItemMap = {
        'test-plugin': {
          'missing-type-1': ['ref1', 'ref2'],
          'missing-type-2': ['ref3'],
        },
      };

      const pluginApi = createMockPluginApi();

      const stats = collectApiStatsForPlugin(pluginApi, {
        missingApiItems,
        referencedDeprecations: {},
        adoptionTrackedAPIs: {},
      });

      expect(stats.missingExports).toBe(2);
    });

    it('handles empty missingApiItems', () => {
      const pluginApi = createMockPluginApi();

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.missingExports).toBe(0);
    });

    it('handles missing plugin entry in missingApiItems', () => {
      const missingApiItems: MissingApiItemMap = {
        'other-plugin': {
          'missing-type': ['ref1'],
        },
      };

      const pluginApi = createMockPluginApi();

      const stats = collectApiStatsForPlugin(pluginApi, {
        missingApiItems,
        referencedDeprecations: {},
        adoptionTrackedAPIs: {},
      });

      expect(stats.missingExports).toBe(0);
    });
  });

  describe('API counting', () => {
    it('counts single API declaration', () => {
      const pluginApi = createMockPluginApi({
        client: [createMockApiDeclaration({ id: 'api1' })],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.apiCount).toBe(1);
    });

    it('counts multiple API declarations across scopes', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({ id: 'client1' }),
          createMockApiDeclaration({ id: 'client2' }),
        ],
        server: [createMockApiDeclaration({ id: 'server1' })],
        common: [createMockApiDeclaration({ id: 'common1' })],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.apiCount).toBe(4);
    });

    it('counts children in API count', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'parent',
            children: [
              createMockApiDeclaration({ id: 'child1' }),
              createMockApiDeclaration({ id: 'child2' }),
            ],
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      // Parent + 2 children = 3
      expect(stats.apiCount).toBe(3);
    });

    it('counts deeply nested children', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'level1',
            children: [
              createMockApiDeclaration({
                id: 'level2',
                children: [createMockApiDeclaration({ id: 'level3' })],
              }),
            ],
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      // level1 + level2 + level3 = 3
      expect(stats.apiCount).toBe(3);
    });
  });

  describe('no references detection', () => {
    it('flags API declarations without references', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'no-refs',
            references: undefined,
          }),
          createMockApiDeclaration({
            id: 'empty-refs',
            references: [],
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.noReferences).toHaveLength(2);
      expect(stats.noReferences.map((d) => d.id)).toEqual(['no-refs', 'empty-refs']);
    });

    it('does not flag API declarations with references', () => {
      const references: ApiReference[] = [{ plugin: 'other-plugin', path: 'src/other/file.ts' }];

      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'with-refs',
            references,
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.noReferences).toHaveLength(0);
    });

    it('recursively checks children for references', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'parent',
            references: [{ plugin: 'other', path: 'file.ts' }],
            children: [
              createMockApiDeclaration({
                id: 'child-no-refs',
                references: undefined,
              }),
            ],
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.noReferences).toHaveLength(1);
      expect(stats.noReferences[0].id).toBe('child-no-refs');
    });
  });

  describe('param doc mismatches detection', () => {
    it('flags functions where not all parameters have documentation', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'fn-partial-docs',
            label: 'fnWithPartialDocs',
            type: TypeKind.FunctionKind,
            description: ['Function description'],
            children: [
              createMockApiDeclaration({
                id: 'param-documented',
                label: 'a',
                description: ['Documented param'],
              }),
              createMockApiDeclaration({
                id: 'param-undocumented',
                label: 'b',
                description: undefined,
              }),
            ],
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.paramDocMismatches).toHaveLength(1);
      expect(stats.paramDocMismatches[0].id).toBe('fn-partial-docs');
    });

    it('does not flag functions where all parameters have documentation', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'fn-all-docs',
            label: 'fnWithAllDocs',
            type: TypeKind.FunctionKind,
            description: ['Function description'],
            children: [
              createMockApiDeclaration({
                id: 'param-a',
                label: 'a',
                description: ['Param a description'],
              }),
              createMockApiDeclaration({
                id: 'param-b',
                label: 'b',
                description: ['Param b description'],
              }),
            ],
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.paramDocMismatches).toHaveLength(0);
    });

    it('does not flag functions with no parameters', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'fn-no-params',
            label: 'fnNoParams',
            type: TypeKind.FunctionKind,
            description: ['Function with no params'],
            children: undefined,
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.paramDocMismatches).toHaveLength(0);
    });

    it('does not flag non-function types', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'interface-with-props',
            label: 'InterfaceWithProps',
            type: TypeKind.InterfaceKind,
            description: ['Interface description'],
            children: [
              createMockApiDeclaration({
                id: 'prop-undocumented',
                label: 'prop',
                description: undefined,
              }),
            ],
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.paramDocMismatches).toHaveLength(0);
    });

    it('detects function-like type aliases via arrow signature', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'fn-type-alias',
            label: 'FnTypeAlias',
            type: TypeKind.TypeKind,
            signature: ['(a: string, b: number) => void'],
            description: ['Type alias for a function'],
            children: [
              createMockApiDeclaration({
                id: 'param-a',
                label: 'a',
                description: ['Documented'],
              }),
              createMockApiDeclaration({
                id: 'param-b',
                label: 'b',
                description: undefined,
              }),
            ],
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.paramDocMismatches).toHaveLength(1);
      expect(stats.paramDocMismatches[0].id).toBe('fn-type-alias');
    });

    it('flags functions with no params documented', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'fn-no-docs',
            label: 'fnNoDocs',
            type: TypeKind.FunctionKind,
            description: ['Function description'],
            children: [
              createMockApiDeclaration({
                id: 'param-a',
                label: 'a',
                description: undefined,
              }),
              createMockApiDeclaration({
                id: 'param-b',
                label: 'b',
                description: [],
              }),
            ],
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.paramDocMismatches).toHaveLength(1);
      expect(stats.paramDocMismatches[0].id).toBe('fn-no-docs');
    });

    it('recursively checks nested functions for param doc mismatches', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'parent-interface',
            label: 'ParentInterface',
            type: TypeKind.InterfaceKind,
            description: ['Interface'],
            children: [
              createMockApiDeclaration({
                id: 'nested-fn',
                label: 'nestedFn',
                type: TypeKind.FunctionKind,
                description: ['Nested function'],
                children: [
                  createMockApiDeclaration({
                    id: 'nested-param',
                    label: 'param',
                    description: undefined,
                  }),
                ],
              }),
            ],
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.paramDocMismatches).toHaveLength(1);
      expect(stats.paramDocMismatches[0].id).toBe('nested-fn');
    });

    it('checks all scopes for param doc mismatches', () => {
      const createFnWithUndocumentedParam = (id: string) =>
        createMockApiDeclaration({
          id,
          type: TypeKind.FunctionKind,
          description: ['Function'],
          children: [
            createMockApiDeclaration({
              id: `${id}-param`,
              label: 'param',
              description: undefined,
            }),
          ],
        });

      const pluginApi = createMockPluginApi({
        client: [createFnWithUndocumentedParam('client-fn')],
        server: [createFnWithUndocumentedParam('server-fn')],
        common: [createFnWithUndocumentedParam('common-fn')],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.paramDocMismatches).toHaveLength(3);
      expect(stats.paramDocMismatches.map((d) => d.id)).toEqual([
        'client-fn',
        'server-fn',
        'common-fn',
      ]);
    });

    it('ignores node_modules paths', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'node-modules-fn',
            type: TypeKind.FunctionKind,
            description: ['Function'],
            path: 'node_modules/some-package/index.ts',
            children: [
              createMockApiDeclaration({
                id: 'node-modules-param',
                label: 'param',
                description: undefined,
              }),
            ],
          }),
          createMockApiDeclaration({
            id: 'regular-fn',
            type: TypeKind.FunctionKind,
            description: ['Function'],
            path: 'src/plugin/file.ts',
            children: [
              createMockApiDeclaration({
                id: 'regular-param',
                label: 'param',
                description: undefined,
              }),
            ],
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.paramDocMismatches).toHaveLength(1);
      expect(stats.paramDocMismatches[0].id).toBe('regular-fn');
    });
  });

  describe('deprecation tracking', () => {
    it('counts referenced deprecations', () => {
      const referencedDeprecations: ReferencedDeprecationsByPlugin = {
        'test-plugin': [
          {
            deprecatedApi: createMockApiDeclaration({ id: 'deprecated1' }),
            ref: { plugin: 'other-plugin', path: 'file.ts' },
          },
          {
            deprecatedApi: createMockApiDeclaration({ id: 'deprecated2' }),
            ref: { plugin: 'other-plugin', path: 'file2.ts' },
          },
        ],
      };

      const pluginApi = createMockPluginApi();

      const stats = collectApiStatsForPlugin(pluginApi, {
        missingApiItems: {},
        referencedDeprecations,
        adoptionTrackedAPIs: {},
      });

      expect(stats.deprecatedAPIsReferencedCount).toBe(2);
    });

    it('handles no deprecations', () => {
      const pluginApi = createMockPluginApi();

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.deprecatedAPIsReferencedCount).toBe(0);
    });

    it('handles missing plugin entry in deprecations', () => {
      const referencedDeprecations: ReferencedDeprecationsByPlugin = {
        'other-plugin': [
          {
            deprecatedApi: createMockApiDeclaration({ id: 'deprecated' }),
            ref: { plugin: 'other', path: 'file.ts' },
          },
        ],
      };

      const pluginApi = createMockPluginApi();

      const stats = collectApiStatsForPlugin(pluginApi, {
        missingApiItems: {},
        referencedDeprecations,
        adoptionTrackedAPIs: {},
      });

      expect(stats.deprecatedAPIsReferencedCount).toBe(0);
    });
  });

  describe('adoption tracking', () => {
    it('tracks adoption-tracked APIs', () => {
      const adoptionTrackedAPIs: AdoptionTrackedAPIsByPlugin = {
        'test-plugin': [
          {
            trackedApi: { id: 'api1', label: 'API1' },
            references: ['plugin1', 'plugin2'],
          },
          {
            trackedApi: { id: 'api2', label: 'API2' },
            references: [],
          },
        ],
      };

      const pluginApi = createMockPluginApi();

      const stats = collectApiStatsForPlugin(pluginApi, {
        missingApiItems: {},
        referencedDeprecations: {},
        adoptionTrackedAPIs,
      });

      expect(stats.adoptionTrackedAPIs).toHaveLength(2);
      expect(stats.adoptionTrackedAPIsCount).toBe(2);
      expect(stats.adoptionTrackedAPIsUnreferencedCount).toBe(1);
    });

    it('handles no adoption-tracked APIs', () => {
      const pluginApi = createMockPluginApi();

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.adoptionTrackedAPIs).toHaveLength(0);
      expect(stats.adoptionTrackedAPIsCount).toBe(0);
      expect(stats.adoptionTrackedAPIsUnreferencedCount).toBe(0);
    });

    it('handles missing plugin entry in adoptionTrackedAPIs', () => {
      const adoptionTrackedAPIs: AdoptionTrackedAPIsByPlugin = {
        'other-plugin': [
          {
            trackedApi: { id: 'api1', label: 'API1' },
            references: ['plugin1'],
          },
        ],
      };

      const pluginApi = createMockPluginApi();

      const stats = collectApiStatsForPlugin(pluginApi, {
        missingApiItems: {},
        referencedDeprecations: {},
        adoptionTrackedAPIs,
      });

      expect(stats.adoptionTrackedAPIs).toHaveLength(0);
      expect(stats.adoptionTrackedAPIsCount).toBe(0);
    });
  });

  describe('destructured parameter handling', () => {
    it('flags missing comments on destructured parameter children', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'function-with-destructured-params',
            label: 'functionWithDestructuredParams',
            type: TypeKind.FunctionKind,
            description: ['Function description'],
            children: [
              createMockApiDeclaration({
                id: 'param-obj',
                label: 'obj',
                description: ['Parent param has comment'],
                children: [
                  createMockApiDeclaration({
                    id: 'param-obj-prop',
                    label: 'prop',
                    description: undefined, // Missing property-level comment
                  }),
                ],
              }),
            ],
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      // Should flag the child property as missing comment
      // Note: This is current behavior - in Phase 4 we'll fix this to check for property-level JSDoc
      expect(stats.missingComments).toHaveLength(1);
      expect(stats.missingComments[0].id).toBe('param-obj-prop');
    });

    it('handles nested destructured parameters', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'nested-destructured',
            type: TypeKind.FunctionKind,
            description: ['Function has comment'],
            children: [
              createMockApiDeclaration({
                id: 'level1',
                description: ['Level 1 has comment'],
                children: [
                  createMockApiDeclaration({
                    id: 'level2',
                    description: ['Level 2 has comment'],
                    children: [
                      createMockApiDeclaration({
                        id: 'level3-no-comment',
                        description: undefined,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      });

      const stats = collectApiStatsForPlugin(pluginApi, createEmptyIssues());

      expect(stats.missingComments).toHaveLength(1);
      expect(stats.missingComments[0].id).toBe('level3-no-comment');
    });
  });

  describe('combined scenarios', () => {
    it('handles complex plugin API with multiple issues', () => {
      const pluginApi = createMockPluginApi({
        client: [
          createMockApiDeclaration({
            id: 'api-with-any',
            type: TypeKind.AnyKind,
            description: ['Has description'],
            references: [{ plugin: 'other', path: 'file.ts' }],
          }),
          createMockApiDeclaration({
            id: 'api-no-comment',
            description: undefined,
            references: [{ plugin: 'other', path: 'file.ts' }],
          }),
          createMockApiDeclaration({
            id: 'api-no-refs',
            description: ['Has description but no refs'],
            references: [],
          }),
          createMockApiDeclaration({
            id: 'api-good',
            description: ['Good API'],
            references: [{ plugin: 'other', path: 'file.ts' }],
          }),
        ],
        server: [
          createMockApiDeclaration({
            id: 'server-any',
            type: TypeKind.AnyKind,
            description: ['Server has any type but has description'],
            references: [{ plugin: 'other', path: 'file.ts' }],
          }),
        ],
      });

      const missingApiItems: MissingApiItemMap = {
        'test-plugin': {
          'missing-1': ['ref1'],
          'missing-2': ['ref2'],
        },
      };

      const referencedDeprecations: ReferencedDeprecationsByPlugin = {
        'test-plugin': [
          {
            deprecatedApi: createMockApiDeclaration({ id: 'deprecated' }),
            ref: { plugin: 'other', path: 'file.ts' },
          },
        ],
      };

      const stats = collectApiStatsForPlugin(pluginApi, {
        missingApiItems,
        referencedDeprecations,
        adoptionTrackedAPIs: {},
      });

      expect(stats.apiCount).toBe(5);
      expect(stats.missingComments).toHaveLength(1);
      expect(stats.isAnyType).toHaveLength(2);
      expect(stats.noReferences).toHaveLength(1);
      expect(stats.missingExports).toBe(2);
      expect(stats.deprecatedAPIsReferencedCount).toBe(1);
    });
  });
});
