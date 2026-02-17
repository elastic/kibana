/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { testConfig, testConfigs } from './test_config';
import { REPO_ROOT } from '@kbn/repo-info';
import fs from 'node:fs';
import fg from 'fast-glob';
import path from 'node:path';

jest.mock('node:fs');
jest.mock('fast-glob');

const dummyManifestProps = {
  exists: false,
  lastModified: new Date(0).toISOString(),
  sha1: '000000000000000-000000000000000',
  tests: [],
};

describe('test_config module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('testConfig.fromPath', () => {
    test.each([
      {
        basePath: 'src/platform',
        moduleGroup: 'platform',
        moduleType: 'plugin',
        moduleVisibility: 'shared',
        testCategory: 'api',
        configType: 'standard',
      },
      {
        basePath: 'src/platform',
        moduleGroup: 'platform',
        moduleType: 'package',
        moduleVisibility: 'private',
        testCategory: 'ui',
        configType: 'parallel',
      },
      {
        basePath: 'x-pack/solutions/observability',
        moduleGroup: 'observability',
        moduleType: 'plugin',
        moduleVisibility: 'private',
        testCategory: 'api',
        configType: 'whatever',
      },
      {
        basePath: 'src/platform',
        moduleGroup: 'platform',
        moduleType: 'plugin',
        moduleVisibility: 'private',
        testCategory: 'ui',
        configType: 'standard',
        nestedName: 'vis_types/timelion',
      },
    ])(
      'can parse a valid config path correctly for $moduleType in $basePath',
      (expected: {
        basePath: string;
        moduleGroup: string;
        moduleType: string;
        moduleVisibility: string;
        testCategory: string;
        configType: string;
        nestedName?: string;
      }) => {
        const moduleName = expected.nestedName ?? 'moddy_mc_moduleface';
        const moduleRoot = path.join(
          expected.basePath,
          `${expected.moduleType}s`,
          expected.moduleVisibility || '',
          moduleName
        );
        const scoutRoot = path.join(moduleRoot, 'test/scout');
        const validManifestContent = {
          lastModified: '2025-12-03T19:04:17.097Z',
          sha1: 'b72df4fa5abc546e5f21e6c2f6eaaaa523755720',
          tests: [
            {
              id: 'f44f18cc703276d-178a4921f7b18d0',
              title: 'Module modularity should be the off the charts',
              expectedStatus: 'passed',
              tags: [
                '@local-serverless-security_complete',
                '@cloud-serverless-security_complete',
                '@local-stateful-classic',
                '@cloud-stateful-classic',
              ],
              location: {
                file: path.join(
                  scoutRoot,
                  `/${expected.testCategory}/tests/modularity/connector.spec.ts`
                ),
                line: 45,
                column: 10,
              },
            },
          ],
        };

        let configFilename = 'playwright.config.ts';

        if (expected.configType !== 'standard') {
          configFilename = `${expected.configType}.${configFilename}`;
        }

        const configPath = path.join(scoutRoot, expected.testCategory, configFilename);
        const manifestPath = path.join(
          scoutRoot,
          `/.meta/${expected.testCategory}/${expected.configType}.json`
        );

        jest.spyOn(fs, 'existsSync').mockReturnValue(true);
        jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(validManifestContent));

        const config = testConfig.fromPath(configPath);

        expect(config).toEqual({
          path: configPath,
          category: expected.testCategory,
          type: expected.configType,
          module: {
            name: moduleName,
            group: expected.moduleGroup,
            type: expected.moduleType,
            visibility: expected.moduleVisibility,
            root: moduleRoot,
          },
          manifest: {
            path: manifestPath,
            exists: true,
            ...validManifestContent,
          },
        });
      }
    );

    it('succeeds even if manifest file is missing', () => {
      const moduleName = 'moddy_mc_moduleface';
      const moduleRoot = path.join('src/platform/plugins/shared', moduleName);
      const scoutRoot = path.join(moduleRoot, 'test/scout');
      const configPath = path.join(scoutRoot, '/api/playwright.config.ts');
      const manifestPath = path.join(scoutRoot, '/.meta/api/standard.json');

      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      const config = testConfig.fromPath(configPath);

      expect(config).toEqual({
        path: configPath,
        category: 'api',
        type: 'standard',
        module: {
          name: moduleName,
          group: 'platform',
          type: 'plugin',
          visibility: 'shared',
          root: moduleRoot,
        },
        manifest: {
          path: manifestPath,
          ...dummyManifestProps,
        },
      });
    });

    it('throws if the given path is not part of the kibana repo', () => {
      const configPath =
        '/not/the/kibana/repo/src/platform/packages/shared/foo/test/scout/api/playwright.config.ts';

      expect(() => testConfig.fromPath(configPath)).toThrow(
        new RegExp(
          `Failed to create Scout config from path '.*${configPath}': ` +
            `path .*${configPath} is not part of the Kibana repository at ${REPO_ROOT}`
        )
      );
    });

    it("throws if the given path doesn't match the expected pattern", () => {
      const configPath = 'this/path/definitely/will/not/match';
      expect(() => testConfig.fromPath(configPath)).toThrow(
        `Failed to create Scout config from path '${configPath}': path did not match the expected regex pattern`
      );
    });

    it('throws if the manifest file is present but invalid', () => {
      const moduleName = 'moddy_mc_moduleface';
      const moduleRoot = path.join('src/platform/plugins/shared', moduleName);
      const scoutRoot = path.join(moduleRoot, 'test/scout');

      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue('{"invalid": JSON }');

      const configPath = path.join(scoutRoot, '/api/playwright.config.ts');
      const manifestPath = path.join(scoutRoot, '/.meta/api/standard.json');

      expect(() => testConfig.fromPath(configPath)).toThrow(
        `Failed while trying to load manifest file at '${manifestPath}'`
      );
    });
  });

  describe('testConfigs', () => {
    const expectedConfigs = [
      {
        path: 'src/platform/plugins/shared/pluggy_mc_pluginface/test/scout/api/playwright.config.ts',
        category: 'api',
        type: 'standard',
        module: {
          name: 'pluggy_mc_pluginface',
          group: 'platform',
          type: 'plugin',
          visibility: 'shared',
          root: 'src/platform/plugins/shared/pluggy_mc_pluginface',
        },
        manifest: {
          path: 'src/platform/plugins/shared/pluggy_mc_pluginface/test/scout/.meta/api/standard.json',
          ...dummyManifestProps,
        },
      },
      {
        path: 'x-pack/solutions/security/packages/halt_who_goes_there/test/scout/api/playwright.config.ts',
        category: 'api',
        type: 'standard',
        module: {
          name: 'halt_who_goes_there',
          group: 'security',
          type: 'package',
          visibility: 'private',
          root: 'x-pack/solutions/security/packages/halt_who_goes_there',
        },
        manifest: {
          path: 'x-pack/solutions/security/packages/halt_who_goes_there/test/scout/.meta/api/standard.json',
          ...dummyManifestProps,
        },
      },
    ];

    it('are lazy loaded', () => {
      jest
        .spyOn(fg, 'globSync')
        .mockReturnValue(expectedConfigs.map((config) => path.join(REPO_ROOT, config.path)));
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const loadSpy = jest.spyOn(testConfigs, '_load');

      expect(testConfigs._configs).toBe(null);
      expect(testConfigs.all).toEqual(expectedConfigs);
      expect(loadSpy).toHaveBeenCalledTimes(1); // _load should have been called
    });

    it('are cached for later use', () => {
      expect(testConfigs._configs).not.toBeNull(); // configs have been cached
    });

    it('are returning data from cache when available', () => {
      const loadSpy = jest.spyOn(testConfigs, '_load');
      expect(testConfigs.all).toHaveLength(expectedConfigs.length); // configs are returned from cache
      expect(loadSpy).toHaveBeenCalledTimes(0); // _load should not have been called
    });

    it('are reloaded when demanded', () => {
      const loadSpy = jest.spyOn(testConfigs, '_load');
      testConfigs.reload();
      expect(loadSpy).toHaveBeenCalledTimes(1); // _load should have been called
    });

    it('can be easily filtered by plugin name', () => {
      expect(testConfigs.forPlugin('pluggy_mc_pluginface')).toHaveLength(1);
    });

    it('can be easily filtered by package name', () => {
      expect(testConfigs.forPackage('halt_who_goes_there')).toHaveLength(1);
    });
  });
});
