/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import fs from 'fs';
import {
  getKibanaModuleData,
  getKibanaModulePath,
  readKibanaModuleManifest,
} from './read_manifest';

describe('read_manifest', () => {
  describe('getKibanaModulePath', () => {
    it('should resolve the manifest path correctly for a valid Scout config path (plugin)', () => {
      const configPath = path.join(
        path.sep,
        'plugins',
        'my_plugin',
        'test',
        'scout',
        'ui',
        'playwright.config.ts'
      );
      const expectedPath = path.resolve(path.sep, 'plugins', 'my_plugin', 'kibana.jsonc');
      expect(getKibanaModulePath(configPath)).toBe(expectedPath);
    });

    it('should resolve the manifest path correctly for a valid Scout config path (package)', () => {
      const configPath = path.join(
        path.sep,
        'packages',
        'my_package',
        'test',
        'scout',
        'api',
        'playwright.config.ts'
      );
      const expectedPath = path.resolve(path.sep, 'packages', 'my_package', 'kibana.jsonc');
      expect(getKibanaModulePath(configPath)).toBe(expectedPath);
    });

    it('should resolve the manifest path correctly for a scout_* config path', () => {
      const configPath = '/plugins/my_plugin/test/scout_custom_config/api/playwright.config.ts';
      const expectedPath = path.resolve('/plugins/my_plugin/kibana.jsonc');
      expect(getKibanaModulePath(configPath)).toBe(expectedPath);
    });

    it(`should throw an error if 'scout' or 'scout_*' is not in the path`, () => {
      const configPath = path.join(
        path.sep,
        'plugins',
        'my_plugin',
        'tests',
        'playwright.config.ts'
      );
      expect(() => getKibanaModulePath(configPath)).toThrow(
        /Invalid path: "scout" or "scout_\*" directory not found/
      );
    });
  });

  describe('readKibanaModuleManifest', () => {
    const pluginFilePath = path.join(path.sep, 'plugins', 'my_plugin', 'kibana.jsonc');
    const packageFilePath = path.join(path.sep, 'packages', 'my_package', 'kibana.jsonc');

    let existsSyncSpy: jest.SpyInstance;
    let readFileSyncSpy: jest.SpyInstance;

    beforeEach(() => {
      existsSyncSpy = jest.spyOn(fs, 'existsSync');
      readFileSyncSpy = jest.spyOn(fs, 'readFileSync');
    });

    afterEach(() => {
      existsSyncSpy.mockRestore();
      readFileSyncSpy.mockRestore();
    });

    it('should read and parse the manifest for plugin correctly', () => {
      const fileContent = `
        {
          "id": "@kbn/my_plugin",
          "type": "plugin",
          "group": "platform",
          "visibility": "private",
          "owner": ["team"],
          "plugin": { "id": "my_plugin" }
        }
      `;
      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockReturnValue(fileContent);

      const result = readKibanaModuleManifest(pluginFilePath);
      expect(result).toEqual({
        id: 'my_plugin',
        type: 'plugin',
        group: 'platform',
        visibility: 'private',
        owner: ['team'],
      });
    });

    it('should read and parse the manifest for package correctly', () => {
      const fileContent = `
        {
          "id": "@kbn/my_package",
          "type": "test-helper",
          "group": "security",
          "visibility": "public",
          "owner": ["team"],
        }
      `;
      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockReturnValue(fileContent);

      const result = readKibanaModuleManifest(packageFilePath);
      expect(result).toEqual({
        id: '@kbn/my_package',
        type: 'package',
        group: 'security',
        visibility: 'public',
        owner: ['team'],
      });
    });

    it('should throw an error if the file does not exist', () => {
      existsSyncSpy.mockReturnValue(false);
      expect(() => readKibanaModuleManifest(pluginFilePath)).toThrow(/Manifest file not found/);
    });

    it('should throw an error if the file cannot be read', () => {
      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockImplementation(() => {
        throw new Error('File read error');
      });
      expect(() => readKibanaModuleManifest(pluginFilePath)).toThrow(
        /Failed to read manifest file/
      );
    });

    it('should throw an error for invalid JSON content', () => {
      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockReturnValue('{ invalid json }');
      expect(() => readKibanaModuleManifest(pluginFilePath)).toThrow(
        /Invalid JSON format in manifest file/
      );
    });

    it('should throw an error for missing required fields', () => {
      const fileContent = `{
        "group": "platform",
        "visibility": "public"
      }`;
      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockReturnValue(fileContent);
      expect(() => readKibanaModuleManifest(pluginFilePath)).toThrow(/Invalid manifest structure/);
    });
  });

  describe('getKibanaModuleData', () => {
    const configInPluginPath = path.join(
      path.sep,
      'plugins',
      'my_plugin',
      'test',
      'scout',
      'ui',
      'playwright.config.ts'
    );
    const configInPackagePath = path.join(
      path.sep,
      'packages',
      'my_package',
      'test',
      'scout',
      'api',
      'playwright.config.ts'
    );

    const pluginManifestContent = `
      {
        "id": "my_plugin",
        "group": "platform",
        "visibility": "public",
        "owner": ["team"],
        "plugin": { "id": "my_plugin" }
      }
    `;

    const packageManifestContent = `
      {
        "id": "my_package",
        "group": "platform",
        "visibility": "public",
        "owner": ["team"],
      }
    `;

    let existsSyncSpy: jest.SpyInstance;
    let readFileSyncSpy: jest.SpyInstance;

    beforeEach(() => {
      existsSyncSpy = jest.spyOn(fs, 'existsSync');
      readFileSyncSpy = jest.spyOn(fs, 'readFileSync');
    });

    afterEach(() => {
      existsSyncSpy.mockRestore();
      readFileSyncSpy.mockRestore();
    });

    it('should resolve and parse the manifest data for plugin correctly', () => {
      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockReturnValue(pluginManifestContent);

      const result = getKibanaModuleData(configInPluginPath);
      expect(result).toEqual({
        id: 'my_plugin',
        type: 'plugin',
        group: 'platform',
        visibility: 'public',
        owner: ['team'],
      });
    });

    it('should resolve and parse the manifest data for package correctly', () => {
      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockReturnValue(packageManifestContent);

      const result = getKibanaModuleData(configInPackagePath);
      expect(result).toEqual({
        id: 'my_package',
        type: 'package',
        group: 'platform',
        visibility: 'public',
        owner: ['team'],
      });
    });
  });
});
