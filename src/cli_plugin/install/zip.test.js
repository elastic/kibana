/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import os from 'os';
import fs from 'fs';

import del from 'del';
import globby from 'globby';

import { analyzeArchive, extractArchive } from './zip';

const getMode = (path) => (fs.statSync(path).mode & parseInt('777', 8)).toString(8);

describe('kibana cli', function () {
  describe('zip', function () {
    const repliesPath = path.resolve(__dirname, '__fixtures__', 'replies');
    const archivePath = path.resolve(repliesPath, 'test_plugin.zip');

    let tempPath;

    beforeEach(() => {
      const randomDir = Math.random().toString(36);
      tempPath = path.resolve(os.tmpdir(), randomDir);
    });

    afterEach(() => {
      del.sync(tempPath, { force: true });
    });

    describe('analyzeArchive', function () {
      it('returns array of plugins', async () => {
        const packages = await analyzeArchive(archivePath);
        expect(packages).toMatchInlineSnapshot(`
          Array [
            Object {
              "id": "testPlugin",
              "kibanaVersion": "1.0.0",
              "stripPrefix": "kibana/test-plugin",
            },
          ]
        `);
      });
    });

    describe('extractArchive', () => {
      it('extracts files using the extractPath filter', async () => {
        const archive = path.resolve(repliesPath, 'test_plugin.zip');
        await extractArchive(archive, tempPath, 'kibana/test-plugin');

        expect(globby.sync('**/*', { cwd: tempPath, onlyFiles: false })).toMatchInlineSnapshot(`
          Array [
            "bin",
            "kibana.json",
            "node_modules",
            "public",
            "bin/executable",
            "bin/not-executable",
            "node_modules/some-package",
            "public/index.js",
            "node_modules/some-package/index.js",
            "node_modules/some-package/package.json",
          ]
        `);
      });
    });

    describe('checkFilePermission', () => {
      it('verify consistency of modes of files', async () => {
        const archivePath = path.resolve(repliesPath, 'test_plugin.zip');

        await extractArchive(archivePath, tempPath, 'kibana/test-plugin/bin');

        expect(globby.sync('**/*', { cwd: tempPath, onlyFiles: false })).toMatchInlineSnapshot(`
          Array [
            "executable",
            "not-executable",
          ]
        `);

        expect(getMode(path.resolve(tempPath, 'executable'))).toEqual('755');
        expect(getMode(path.resolve(tempPath, 'not-executable'))).toEqual('644');
      });
    });

    it('handles a corrupt zip archive', async () => {
      await expect(
        extractArchive(path.resolve(repliesPath, 'corrupt.zip'))
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"end of central directory record signature not found"`
      );
    });
  });
});
