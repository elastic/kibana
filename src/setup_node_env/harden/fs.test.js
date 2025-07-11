/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-restricted-syntax */

const patchFs = require('./fs');
// eslint-disable-next-line @kbn/imports/uniform_imports
const { REPO_ROOT } = require('../../platform/packages/shared/kbn-repo-info');

const join = require('path').join;

const DATA_PATH = join(REPO_ROOT, 'data');

const fs = require('fs');
const fsPromises = require('fs/promises');

// Patch the fs module
const safeFs = patchFs(fs);
const safeFsPromises = patchFs(fsPromises);

describe('Hardened FS', () => {
  afterAll(() => {
    // safeFs.unlinkSync(join(DATA_PATH, 'good.json'));
    // safeFs.unlinkSync(join(DATA_PATH, 'stream.json'));
  });

  describe('callback', () => {
    it('should allow writing to safe paths', (done) => {
      safeFs.writeFile(join(DATA_PATH, 'good.json'), 'hello', (err) => {
        expect(err).toBeFalsy();
        done();
      });
    });

    it('should prevent writing to Path traversal sequences not alloweds', (done) => {
      safeFs.writeFile('../bad.json', 'pwn', (err) => {
        expect(err).toBeTruthy();
        expect(err.message).toMatch(/Path traversal sequences not allowed/);
        done();
      });
    });
  });

  describe('promise', () => {
    it('should allow writing to safe paths', async () => {
      await expect(
        safeFsPromises.writeFile(join(DATA_PATH, 'good.json'), 'world')
      ).resolves.not.toThrow();
    });

    it('should prevent writing to Path traversal sequences not alloweds', async () => {
      expect(() => safeFsPromises.writeFile('../../evil2.json', 'hax')).toThrow(
        /Path traversal sequences not allowed/
      );
    });
  });

  describe('stream', () => {
    it('should allow creating write streams to safe paths', () => {
      expect(() => {
        const ws = safeFs.createWriteStream(join(DATA_PATH, 'stream.json'));
        ws.write('streaming');
        ws.end();
      }).not.toThrow();
    });

    it('should prevent creating write streams to Path traversal sequences not alloweds', () => {
      expect(() => {
        safeFs.createWriteStream('../../stream-bad.json');
      }).toThrow(/Path traversal sequences not allowed/);
    });
  });
});
