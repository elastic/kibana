/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-restricted-syntax */

const { createFsProxy, createFsPromisesProxy } = require('./fs');
// eslint-disable-next-line @kbn/imports/uniform_imports
const { REPO_ROOT } = require('../../platform/packages/shared/kbn-repo-info');
const { fsEventBus, FS_CONFIG_EVENT } = require('@kbn/security-hardening/fs-event-bus');

const join = require('path').join;

const DATA_PATH = join(REPO_ROOT, 'data');

const fs = require('fs');
const fsPromises = require('fs/promises');

// Patch the fs module
const safeFs = createFsProxy(fs);
const safeFsPromises = createFsPromisesProxy(fsPromises);

describe('Hardened FS', () => {
  beforeAll(() => {
    process.env.KBN_ENABLE_HARDENED_FS = true;
    // Emit the configuration event to set up safe paths
    fsEventBus.emit(FS_CONFIG_EVENT, {
      safe_paths: [DATA_PATH],
      enabled: true,
    });
  });

  afterAll(() => {
    process.env.KBN_ENABLE_HARDENED_FS = false;
    // safeFs.unlinkSync(join(DATA_PATH, 'good.json'));
    // safeFs.unlinkSync(join(DATA_PATH, 'stream.json'));
  });

  describe('callback', () => {
    it('should allow writing to safe paths', (done) => {
      safeFs.writeFile(join(DATA_PATH, 'good.json'), 'hello', (err) => {
        expect(err).toBeFalsy();

        safeFs.unlinkSync(join(DATA_PATH, 'good.json'));
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

    it('path traversal sequences not allowed', async () => {
      expect(() => safeFsPromises.writeFile('../../evil2.json', 'hax')).toThrow(
        /Path traversal sequences not allowed/
      );
    });

    it('should prevent writing to unsafe paths', async () => {
      expect(() => safeFsPromises.writeFile('/tmp/evil2.json', 'hax')).toThrow(/Unsafe path/);
    });
  });

  describe('stream', () => {
    it('should allow creating write streams to safe paths', (done) => {
      const filePath = join(DATA_PATH, 'stream.json');
      const ws = safeFs.createWriteStream(filePath);

      ws.write('streaming');
      ws.end();

      ws.on('error', done);

      ws.on('close', () => {
        safeFsPromises
          .readFile(filePath, 'utf8')
          .then((content) => {
            expect(content).toBe('streaming');
            return safeFsPromises.unlink(filePath);
          })
          .then(() => done())
          .catch(done);
      });
    });

    it('path traversal sequences not allowed', () => {
      expect(() => {
        safeFs.createWriteStream('../../stream-bad.json');
      }).toThrow(/Path traversal sequences not allowed/);
    });
  });
});
