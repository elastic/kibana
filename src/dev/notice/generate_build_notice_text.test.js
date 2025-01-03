/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { readFileSync } from 'fs';

import { generateBuildNoticeText } from './generate_build_notice_text';

const NODE_MODULES = resolve(__dirname, '__fixtures__/node_modules');
const NODE_DIR = resolve(__dirname, '__fixtures__/fake_nodejs_install');
const NODE_VERSION = '8.11.3';
const PACKAGES = [
  {
    name: 'bar',
    version: '1.0.0',
    licenses: ['MIT'],
    directory: resolve(NODE_MODULES, 'bar'),
    relative: 'node_modules/bar',
  },
  {
    name: 'foo',
    version: '1.0.0',
    licenses: ['Apache 2.0'],
    directory: resolve(NODE_MODULES, 'foo'),
    relative: 'node_modules/foo',
  },
];

describe('src/dev/build/tasks/notice_file/generate_notice', () => {
  describe('generateBuildNoticeText()', () => {
    let notice;
    beforeAll(
      async () =>
        (notice = await generateBuildNoticeText({
          packages: PACKAGES,
          nodeDir: NODE_DIR,
          nodeVersion: NODE_VERSION,
          noticeFromSource: 'NOTICE_FROM_SOURCE\n',
        }))
    );

    it('returns a string', () => {
      expect(typeof notice).toBe('string');
    });

    it('includes *NOTICE* files from packages', () => {
      expect(notice).toEqual(
        expect.stringContaining(readFileSync(resolve(NODE_MODULES, 'foo/NOTICE.txt'), 'utf8'))
      );
    });

    it('includes *LICENSE* files from packages', () => {
      expect(notice).toEqual(
        expect.stringContaining(readFileSync(resolve(NODE_MODULES, 'bar/LICENSE.md'), 'utf8'))
      );
    });

    it('includes the LICENSE file from node', () => {
      expect(notice).toEqual(
        expect.stringContaining(readFileSync(resolve(NODE_DIR, 'LICENSE'), 'utf8'))
      );
    });

    it('includes node version', () => {
      expect(notice).toEqual(expect.stringContaining('This product bundles Node.js v8.11.3'));
    });

    it('includes the noticeFromSource', () => {
      expect(notice).toEqual(expect.stringContaining('NOTICE_FROM_SOURCE'));
    });
  });
});
