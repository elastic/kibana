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
import { getManifestPath, readPluginManifest, getPluginManifestData } from './plugin_manifest';

jest.mock('fs');

describe('plugin_manifest', () => {
  describe('getManifestPath', () => {
    it('should resolve the manifest path correctly for a valid config path', () => {
      const configPath = '/plugins/my_plugin/test/scout/ui/playwright.config.ts';
      const expectedPath = path.resolve('/plugins/my_plugin/kibana.jsonc');
      expect(getManifestPath(configPath)).toBe(expectedPath);
    });

    it(`should throw an error if 'scout' is not in the path`, () => {
      const configPath = '/plugins/my_plugin/tests/playwright.config.ts';
      expect(() => getManifestPath(configPath)).toThrow(
        /Invalid path: "scout" directory not found/
      );
    });
  });

  describe('readPluginManifest', () => {
    const filePath = '/plugins/my_plugin/kibana.jsonc';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should read and parse the manifest file correctly', () => {
      const fileContent = `
        {
          "id": "my_plugin",
          "group": "platform",
          "visibility": "private",
          "owner": ["team"],
          "plugin": { "id": "my_plugin" }
        }
      `;
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(fileContent);

      const result = readPluginManifest(filePath);
      expect(result).toEqual({
        id: 'my_plugin',
        group: 'platform',
        visibility: 'private',
        owner: ['team'],
        plugin: { id: 'my_plugin' },
      });
    });

    it('should throw an error if the file does not exist', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      expect(() => readPluginManifest(filePath)).toThrow(/Manifest file not found/);
    });

    it('should throw an error if the file cannot be read', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('File read error');
      });
      expect(() => readPluginManifest(filePath)).toThrow(/Failed to read manifest file/);
    });

    it('should throw an error for invalid JSON content', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue('{ invalid json }');
      expect(() => readPluginManifest(filePath)).toThrow(/Invalid JSON format in manifest file/);
    });

    it('should throw an error for missing required fields', () => {
      const fileContent = `{
        "group": "platform",
        "visibility": "public"
      }`;
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(fileContent);
      expect(() => readPluginManifest(filePath)).toThrow(/Invalid manifest structure/);
    });
  });

  describe('getPluginManifestData', () => {
    const configPath = '/plugins/my_plugin/test/scout/ui/playwright.config.ts';
    const manifestContent = `
      {
        "id": "my_plugin",
        "group": "platform",
        "visibility": "public",
        "owner": ["team"],
        "plugin": { "id": "my_plugin" }
      }
    `;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should resolve and parse the manifest data correctly', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(manifestContent);

      const result = getPluginManifestData(configPath);
      expect(result).toEqual({
        id: 'my_plugin',
        group: 'platform',
        visibility: 'public',
        owner: ['team'],
        plugin: { id: 'my_plugin' },
      });
    });
  });
});
