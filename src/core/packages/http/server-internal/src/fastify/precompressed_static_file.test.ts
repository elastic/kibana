/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  orderPrecompressedEncodings,
  resolvePrecompressedStaticPath,
} from './precompressed_static_file';

describe('precompressed_static_file', () => {
  describe('orderPrecompressedEncodings', () => {
    it('prefers br when listed after gzip at equal q', () => {
      expect(orderPrecompressedEncodings('gzip, br')).toEqual(['br', 'gzip']);
    });

    it('respects q values', () => {
      expect(orderPrecompressedEncodings('gzip;q=1.0, br;q=0.5')).toEqual(['gzip', 'br']);
    });

    it('returns empty when missing', () => {
      expect(orderPrecompressedEncodings(undefined)).toEqual([]);
    });
  });

  describe('resolvePrecompressedStaticPath', () => {
    let dir: string;
    beforeEach(async () => {
      dir = await fs.mkdtemp(path.join(os.tmpdir(), 'precomp-'));
    });
    afterEach(async () => {
      await fs.rm(dir, { recursive: true, force: true });
    });

    it('serves .gz when negotiated', async () => {
      const base = path.join(dir, 'file.js');
      await fs.writeFile(base, 'original', 'utf8');
      await fs.writeFile(`${base}.gz`, 'gz-bytes', 'utf8');
      const r = await resolvePrecompressedStaticPath(base, 'gzip');
      expect(r.path).toBe(`${base}.gz`);
      expect(r.contentEncoding).toBe('gzip');
    });

    it('prefers .br when negotiated first', async () => {
      const base = path.join(dir, 'file.js');
      await fs.writeFile(base, 'original', 'utf8');
      await fs.writeFile(`${base}.gz`, 'gz-bytes', 'utf8');
      await fs.writeFile(`${base}.br`, 'br-bytes', 'utf8');
      const r = await resolvePrecompressedStaticPath(base, 'gzip, br');
      expect(r.path).toBe(`${base}.br`);
      expect(r.contentEncoding).toBe('br');
    });
  });
});
