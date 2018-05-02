import { resolve } from 'path';
import { readFileSync } from 'fs';

import { generateBuildNoticeText } from './generate_build_notice_text';

const NODE_MODULES = resolve(__dirname, '__fixtures__/node_modules');
const NODE_DIR = resolve(process.execPath, '../..');
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
          noticeFromSource: 'NOTICE_FROM_SOURCE\n'
        }))
    );

    it('returns a string', () => {
      expect(typeof notice).toBe('string');
    });

    it('includes *NOTICE* files from packages', () => {
      expect(notice).toEqual(expect.stringContaining(
        readFileSync(resolve(NODE_MODULES, 'foo/NOTICE.txt'), 'utf8')
      ));
    });

    it('includes *LICENSE* files from packages', () => {
      expect(notice).toEqual(expect.stringContaining(
        readFileSync(
          resolve(NODE_MODULES, 'bar/LICENSE.md'),
          'utf8'
        )
      ));
    });

    it('includes the LICENSE file from node', () => {
      expect(notice).toEqual(expect.stringContaining(
        readFileSync(resolve(NODE_DIR, 'LICENSE'), 'utf8')
      ));
    });

    it('includes the noticeFromSource', () => {
      expect(notice).toEqual(expect.stringContaining(
        'NOTICE_FROM_SOURCE'
      ));
    });
  });
});
