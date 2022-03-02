/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import mockFs from 'mock-fs';
import fs from 'fs';

import { JestConfigs } from './jest_configs';

describe('jestConfigs', () => {
  let jestConfigs: JestConfigs;

  beforeEach(async () => {
    mockFs({
      '/kbn-test/packages': {
        a: {
          'jest.config.js': '',
          'a_first.test.js': '',
          'a_second.test.js': '',
        },
        b: {
          'b.test.js': '',
          integration_tests: {
            'b_integration.test.js': '',
          },
          nested: {
            d: {
              'd.test.js': '',
            },
          },
        },
        c: {
          'jest.integration.config.js': '',
          integration_tests: {
            'c_integration.test.js': '',
          },
        },
      },
    });
    jestConfigs = new JestConfigs('/kbn-test', ['packages/b/nested', 'packages']);
  });

  afterEach(mockFs.restore);

  describe('#files', () => {
    it('lists unit test files', async () => {
      const files = await jestConfigs.files('unit');
      expect(files).toEqual([
        'packages/a/a_first.test.js',
        'packages/a/a_second.test.js',
        'packages/b/b.test.js',
        'packages/b/nested/d/d.test.js',
      ]);
    });

    it('lists integration test files', async () => {
      const files = await jestConfigs.files('integration');
      expect(files).toEqual([
        'packages/b/integration_tests/b_integration.test.js',
        'packages/c/integration_tests/c_integration.test.js',
      ]);
    });
  });

  describe('#expected', () => {
    it('expects unit config files', async () => {
      const files = await jestConfigs.expected('unit');
      expect(files).toEqual([
        'packages/a/jest.config.js',
        'packages/b/jest.config.js',
        'packages/b/nested/d/jest.config.js',
      ]);
    });

    it('expects integration config files', async () => {
      const files = await jestConfigs.expected('integration');
      expect(files).toEqual([
        'packages/b/jest.integration.config.js',
        'packages/c/jest.integration.config.js',
      ]);
    });

    it('throws if test file outside root', async () => {
      fs.writeFileSync('/kbn-test/bad.test.js', '');
      await expect(() => jestConfigs.expected('unit')).rejects.toMatchSnapshot();
    });
  });

  describe('#existing', () => {
    it('lists existing unit test config files', async () => {
      const files = await jestConfigs.existing('unit');
      expect(files).toEqual(['packages/a/jest.config.js']);
    });

    it('lists existing integration test config files', async () => {
      const files = await jestConfigs.existing('integration');
      expect(files).toEqual(['packages/c/jest.integration.config.js']);
    });
  });

  describe('#missing', () => {
    it('lists existing unit test config files', async () => {
      const files = await jestConfigs.missing('unit');
      expect(files).toEqual(['packages/b/jest.config.js', 'packages/b/nested/d/jest.config.js']);
    });

    it('lists existing integration test config files', async () => {
      const files = await jestConfigs.missing('integration');
      expect(files).toEqual(['packages/b/jest.integration.config.js']);
    });
  });
});
