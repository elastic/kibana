/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RuleTester } from 'eslint';
import dedent from 'dedent';
import { NoGroupCrossingManifestsRule } from './no_group_crossing_manifests';
import { formatSuggestions } from '../helpers/report';
import { ModuleId } from '@kbn/repo-source-classifier/src/module_id';
import { ModuleGroup, ModuleVisibility } from '@kbn/repo-info/types';

const makePlugin = (filename: string) => ({
  filename,
  code: dedent`
    export function plugin() {
      return new MyPlugin();
    }
  `,
});

const makePluginClass = (filename: string) => ({
  filename,
  code: dedent`
    class MyPlugin implements Plugin {
      setup() {
        console.log('foo');
      }
      start() {
        console.log('foo');
      }
    }
  `,
});

const makeModuleByPath = (
  path: string,
  group: ModuleGroup,
  visibility: ModuleVisibility,
  pluginOverrides: any = {}
): Record<string, ModuleId> => {
  const pluginId = path.split('/')[4];
  const packageId = `@kbn/${pluginId}-plugin`;

  return {
    [path]: {
      type: 'server package',
      dirs: [],
      repoRel: 'some/relative/path',
      pkgInfo: {
        pkgId: packageId,
        pkgDir: path.split('/').slice(0, -2).join('/'),
        rel: 'some/relative/path',
      },
      group,
      visibility,
      manifest: {
        type: 'plugin',
        id: packageId,
        owner: ['@kbn/kibana-operations'],
        plugin: {
          id: pluginId,
          browser: true,
          server: true,
          ...pluginOverrides,
        },
      },
    },
  };
};

const makeError = (line: number, ...violations: string[]) => ({
  line,
  messageId: 'ILLEGAL_MANIFEST_DEPENDENCY',
  data: {
    violations: violations.join('\n'),
    suggestion: formatSuggestions([
      `Please review the dependencies in your plugin's manifest (kibana.jsonc).`,
      `Relocate this module to a different group, and/or make sure it has the right 'visibility'.`,
      `Address the conflicting dependencies by refactoring the code`,
    ]),
  },
});

jest.mock('../helpers/repo_source_classifier', () => {
  const MODULES_BY_PATH: Record<string, ModuleId> = {
    ...makeModuleByPath(
      'path/to/search/plugins/searchPlugin1/server/index.ts',
      'search',
      'private',
      {
        requiredPlugins: ['searchPlugin2'], // allowed, same group
      }
    ),
    ...makeModuleByPath(
      'path/to/search/plugins/searchPlugin2/server/index.ts',
      'search',
      'private',
      {
        requiredPlugins: ['securityPlugin1'], // invalid, dependency belongs to another group
      }
    ),
    ...makeModuleByPath(
      'path/to/security/plugins/securityPlugin1/server/index.ts',
      'security',
      'private',
      {
        requiredPlugins: ['securityPlugin2'], // allowed, same group
      }
    ),
    ...makeModuleByPath(
      'path/to/security/plugins/securityPlugin2/server/index.ts',
      'security',
      'private',
      {
        requiredPlugins: ['platformPlugin1', 'platformPlugin2', 'platformPlugin3'], // 3rd one is private!
      }
    ),
    ...makeModuleByPath(
      'path/to/platform/shared/platformPlugin1/server/index.ts',
      'platform',
      'shared',
      {
        requiredPlugins: ['platformPlugin2', 'platformPlugin3', 'platformPlugin4'],
      }
    ),
    ...makeModuleByPath(
      'path/to/platform/shared/platformPlugin2/server/index.ts',
      'platform',
      'shared'
    ),
    ...makeModuleByPath(
      'path/to/platform/private/platformPlugin3/server/index.ts',
      'platform',
      'private'
    ),
    ...makeModuleByPath(
      'path/to/platform/private/platformPlugin4/server/index.ts',
      'platform',
      'private'
    ),
  };

  return {
    getRepoSourceClassifier() {
      return {
        classify(path: string) {
          return MODULES_BY_PATH[path];
        },
      };
    },
  };
});

jest.mock('@kbn/repo-packages', () => {
  const original = jest.requireActual('@kbn/repo-packages');

  return {
    ...original,
    getPluginPackagesFilter: () => () => true,
    getPackages() {
      return [
        'path/to/search/plugins/searchPlugin1/server/index.ts',
        'path/to/search/plugins/searchPlugin2/server/index.ts',
        'path/to/security/plugins/securityPlugin1/server/index.ts',
        'path/to/security/plugins/securityPlugin2/server/index.ts',
        'path/to/platform/shared/platformPlugin1/server/index.ts',
        'path/to/platform/shared/platformPlugin2/server/index.ts',
        'path/to/platform/private/platformPlugin3/server/index.ts',
        'path/to/platform/private/platformPlugin4/server/index.ts',
      ].map((path) => {
        const [, , group, , id] = path.split('/');
        return {
          id: `@kbn/${id}-plugin`,
          group,
          visibility: path.includes('platform/shared') ? 'shared' : 'private',
          manifest: {
            plugin: {
              id,
            },
          },
        };
      });
    },
  };
});

const tsTester = [
  '@typescript-eslint/parser',
  new RuleTester({
    parser: require.resolve('@typescript-eslint/parser'),
    parserOptions: {
      sourceType: 'module',
      ecmaVersion: 2018,
      ecmaFeatures: {
        jsx: true,
      },
    },
  }),
] as const;

const babelTester = [
  '@babel/eslint-parser',
  new RuleTester({
    parser: require.resolve('@babel/eslint-parser'),
    parserOptions: {
      sourceType: 'module',
      ecmaVersion: 2018,
      requireConfigFile: false,
      babelOptions: {
        presets: ['@kbn/babel-preset/node_preset'],
      },
    },
  }),
] as const;

for (const [name, tester] of [tsTester, babelTester]) {
  describe(name, () => {
    tester.run('@kbn/imports/no_group_crossing_manifests', NoGroupCrossingManifestsRule, {
      valid: [
        makePlugin('path/to/search/plugins/searchPlugin1/server/index.ts'),
        makePlugin('path/to/security/plugins/securityPlugin1/server/index.ts'),
        makePlugin('path/to/platform/shared/platformPlugin1/server/index.ts'),
        makePluginClass('path/to/search/plugins/searchPlugin1/server/index.ts'),
        makePluginClass('path/to/security/plugins/securityPlugin1/server/index.ts'),
        makePluginClass('path/to/platform/shared/platformPlugin1/server/index.ts'),
      ],
      invalid: [
        {
          ...makePlugin('path/to/search/plugins/searchPlugin2/server/index.ts'),
          errors: [
            makeError(
              1,
              `⚠ Illegal dependency on manifest: Plugin "searchPlugin2" (package: "@kbn/searchPlugin2-plugin"; group: "search") depends on "securityPlugin1" (package: "@kbn/securityPlugin1-plugin"; group: security/private). File: path/to/search/plugins/searchPlugin2/kibana.jsonc`
            ),
          ],
        },
        {
          ...makePlugin('path/to/security/plugins/securityPlugin2/server/index.ts'),
          errors: [
            makeError(
              1,
              `⚠ Illegal dependency on manifest: Plugin "securityPlugin2" (package: "@kbn/securityPlugin2-plugin"; group: "security") depends on "platformPlugin3" (package: "@kbn/platformPlugin3-plugin"; group: platform/private). File: path/to/security/plugins/securityPlugin2/kibana.jsonc`
            ),
          ],
        },
        {
          ...makePluginClass('path/to/search/plugins/searchPlugin2/server/index.ts'),
          errors: [
            makeError(
              2,
              `⚠ Illegal dependency on manifest: Plugin "searchPlugin2" (package: "@kbn/searchPlugin2-plugin"; group: "search") depends on "securityPlugin1" (package: "@kbn/securityPlugin1-plugin"; group: security/private). File: path/to/search/plugins/searchPlugin2/kibana.jsonc`
            ),
            makeError(
              5,
              `⚠ Illegal dependency on manifest: Plugin "searchPlugin2" (package: "@kbn/searchPlugin2-plugin"; group: "search") depends on "securityPlugin1" (package: "@kbn/securityPlugin1-plugin"; group: security/private). File: path/to/search/plugins/searchPlugin2/kibana.jsonc`
            ),
          ],
        },
        {
          ...makePluginClass('path/to/security/plugins/securityPlugin2/server/index.ts'),
          errors: [
            makeError(
              2,
              `⚠ Illegal dependency on manifest: Plugin "securityPlugin2" (package: "@kbn/securityPlugin2-plugin"; group: "security") depends on "platformPlugin3" (package: "@kbn/platformPlugin3-plugin"; group: platform/private). File: path/to/security/plugins/securityPlugin2/kibana.jsonc`
            ),
            makeError(
              5,
              `⚠ Illegal dependency on manifest: Plugin "securityPlugin2" (package: "@kbn/securityPlugin2-plugin"; group: "security") depends on "platformPlugin3" (package: "@kbn/platformPlugin3-plugin"; group: platform/private). File: path/to/security/plugins/securityPlugin2/kibana.jsonc`
            ),
          ],
        },
      ],
    });
  });
}
