/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as commonEntry from './common';
import * as rootEntry from '.';

const SEP = __dirname.includes('\\') ? '\\' : '/';

const getPkgDir = (): string => {
  const commonPath = require.resolve('./common');
  return commonPath.slice(0, commonPath.lastIndexOf(SEP));
};

describe('@kbn/connector-specs/common', () => {
  describe('module-load boundary', () => {
    beforeEach(() => {
      jest.resetModules();
      const pkgDir = getPkgDir();
      for (const modulePath of Object.keys(require.cache)) {
        if (modulePath === __filename || !modulePath.startsWith(`${pkgDir}${SEP}`)) {
          continue;
        }
        delete require.cache[modulePath];
      }
    });

    it('does not load the specs barrel or any spec module', () => {
      const pkgDir = getPkgDir();
      const allSpecsPath = require.resolve('./src/all_specs');
      const specsDir = `${pkgDir}${SEP}src${SEP}specs${SEP}`;
      // common.ts re-exports INBOUND_WEBHOOK_* from this constants file.
      // That file is not a spec module and does not import one.
      const allowedSpecsConstants = `${specsDir}inbound_webhook${SEP}constants.ts`;

      require('./common');

      const loadedForbidden = Object.keys(require.cache).filter(
        (modulePath) =>
          modulePath === allSpecsPath ||
          (modulePath.startsWith(specsDir) && modulePath !== allowedSpecsConstants)
      );
      expect(loadedForbidden).toEqual([]);
    });
  });

  describe('subset of the root entry', () => {
    it('re-exports the same values as the package root', () => {
      const root = rootEntry as Record<string, unknown>;
      const common = commonEntry as Record<string, unknown>;

      for (const key of Object.keys(commonEntry)) {
        expect(root).toHaveProperty(key);
        expect(root[key]).toBe(common[key]);
      }
    });
  });
});
