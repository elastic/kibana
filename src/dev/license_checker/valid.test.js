/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { resolve } from 'path';

import { assertLicensesValid } from './valid';

const ROOT = resolve(__dirname, '../../../../');
const NODE_MODULES = resolve(ROOT, './node_modules');

const PACKAGE = {
  name: '@elastic/httpolyglot',
  version: '0.1.2-elasticpatch1',
  licenses: ['MIT'],
  directory: resolve(NODE_MODULES, '@elastic/httpolyglot'),
  relative: 'node_modules/@elastic/httpolyglot',
};

describe('tasks/lib/licenses', () => {
  describe('assertLicensesValid()', () => {
    it('returns undefined when package has valid license', () => {
      expect(
        assertLicensesValid({
          packages: [PACKAGE],
          validLicenses: [...PACKAGE.licenses],
        })
      ).toBe(undefined);
    });

    it('throw an error when the packages license is invalid', () => {
      expect(() => {
        assertLicensesValid({
          packages: [PACKAGE],
          validLicenses: [`not ${PACKAGE.licenses[0]}`],
        });
      }).toThrow(PACKAGE.name);
    });

    it('throws an error when the package has no licenses', () => {
      expect(() => {
        assertLicensesValid({
          packages: [
            {
              ...PACKAGE,
              licenses: [],
            },
          ],
          validLicenses: [...PACKAGE.licenses],
        });
      }).toThrow(PACKAGE.name);
    });

    it('includes the relative path to packages in error message', () => {
      try {
        assertLicensesValid({
          packages: [PACKAGE],
          validLicenses: ['none'],
        });
        throw new Error('expected assertLicensesValid() to throw');
      } catch (error) {
        expect(error.message).toContain(PACKAGE.relative);
        expect(error.message).not.toContain(PACKAGE.directory);
      }
    });
  });
});
