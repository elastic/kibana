/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import UiSharedDepsNpm from '@kbn/ui-shared-deps-npm';
import * as UiSharedDepsSrc from '@kbn/ui-shared-deps-src';

describe('DLL manifest integration', () => {
  const manifest = JSON.parse(Fs.readFileSync(UiSharedDepsNpm.dllManifestPath, 'utf8'));

  it('should load the DLL manifest successfully', () => {
    expect(manifest).toBeDefined();
    expect(typeof manifest).toBe('object');
  });

  it('should expose the correct DLL global name', () => {
    expect(manifest.name).toBe('__kbnSharedDeps_npm__');
  });

  it('should contain a non-trivial number of modules', () => {
    const moduleCount = Object.keys(manifest.content).length;
    expect(moduleCount).toBeGreaterThan(1000);
  });

  describe('DLL-only modules (not covered by externals) are present', () => {
    const dllOnlyModules = [
      './node_modules/@babel/runtime/helpers/esm/assertThisInitialized.js',
      './node_modules/@babel/runtime/helpers/esm/classPrivateFieldGet.js',
      './node_modules/@babel/runtime/helpers/esm/inheritsLoose.js',
      './node_modules/core-js/stable/index.js',
      './node_modules/qs/lib/index.js',
    ];

    for (const modulePath of dllOnlyModules) {
      it(`should include "${modulePath}"`, () => {
        expect(manifest.content[modulePath]).toBeDefined();
      });
    }
  });

  describe('relationship between externals and DLL', () => {
    const sharedDepsExternals = UiSharedDepsSrc.externals as Record<string, string>;

    it('externals map to __kbnSharedDeps__ (src bundle), DLL maps to __kbnSharedDeps_npm__', () => {
      for (const value of Object.values(sharedDepsExternals)) {
        expect(value).toContain('__kbnSharedDeps__');
        expect(value).not.toContain('__kbnSharedDeps_npm__');
      }
      expect(manifest.name).toBe('__kbnSharedDeps_npm__');
    });

    it('DLL entry packages overlap with externals (both handle the same top-level deps)', () => {
      const dllModulePaths = Object.keys(manifest.content);
      const hasReact = dllModulePaths.some((p) => p.includes('node_modules/react/'));
      const hasLodash = dllModulePaths.some((p) => p.includes('node_modules/lodash/'));
      const hasRxjs = dllModulePaths.some((p) => p.includes('node_modules/rxjs/'));

      expect(hasReact).toBe(true);
      expect(hasLodash).toBe(true);
      expect(hasRxjs).toBe(true);

      expect(sharedDepsExternals.react).toBeDefined();
      expect(sharedDepsExternals.lodash).toBeDefined();
      expect(sharedDepsExternals.rxjs).toBeDefined();
    });
  });
});
