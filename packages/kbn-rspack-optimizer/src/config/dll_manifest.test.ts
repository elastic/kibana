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
import { loadDllManifest } from './dll_manifest';

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

describe('loadDllManifest sanitisation', () => {
  const sanitized = loadDllManifest();
  const raw = JSON.parse(Fs.readFileSync(UiSharedDepsNpm.dllManifestPath, 'utf8'));

  it('keeps pure CJS modules (exportsType=default + redirect) with stripped buildMeta', () => {
    const defaultKeys = Object.keys(raw.content).filter((key) => {
      const meta = raw.content[key].buildMeta;
      return (
        meta?.exportsType === 'default' &&
        (meta?.defaultObject === 'redirect' || meta?.defaultObject === 'redirect-warn')
      );
    });
    expect(defaultKeys.length).toBeGreaterThan(0);
    for (const key of defaultKeys) {
      expect(sanitized.content[key]).toBeDefined();
      expect(sanitized.content[key].buildMeta).toBeUndefined();
    }
  });

  it('preserves namespace modules with only exportsType', () => {
    const nsKeys = Object.keys(raw.content).filter(
      (key) => raw.content[key].buildMeta?.exportsType === 'namespace'
    );
    expect(nsKeys.length).toBeGreaterThan(0);
    for (const key of nsKeys) {
      expect(sanitized.content[key].buildMeta).toEqual({ exportsType: 'namespace' });
    }
  });

  it('normalises flagged+redirect to { exportsType: "flagged" }', () => {
    const flaggedKeys = Object.keys(raw.content).filter((key) => {
      const meta = raw.content[key].buildMeta;
      return (
        meta?.exportsType === 'flagged' &&
        (meta?.defaultObject === 'redirect' || meta?.defaultObject === 'redirect-warn')
      );
    });
    expect(flaggedKeys.length).toBeGreaterThan(0);
    for (const key of flaggedKeys) {
      expect(sanitized.content[key].buildMeta).toEqual({ exportsType: 'flagged' });
    }
  });

  it('normalises dynamic+redirect to { exportsType: "flagged" }', () => {
    const dynamicKeys = Object.keys(raw.content).filter((key) => {
      const meta = raw.content[key].buildMeta;
      return (
        meta?.exportsType === 'dynamic' &&
        (meta?.defaultObject === 'redirect' || meta?.defaultObject === 'redirect-warn')
      );
    });
    expect(dynamicKeys.length).toBeGreaterThan(0);
    for (const key of dynamicKeys) {
      expect(sanitized.content[key].buildMeta).toEqual({ exportsType: 'flagged' });
    }
  });

  it('strips defaultObject from all sanitized entries', () => {
    for (const entry of Object.values(sanitized.content) as Array<{
      buildMeta?: { defaultObject?: unknown };
    }>) {
      if (entry.buildMeta) {
        expect(entry.buildMeta.defaultObject).toBeUndefined();
      }
    }
  });

  it('strips buildMeta from modules without redirect defaultObject', () => {
    const otherKeys = Object.keys(raw.content).filter((key) => {
      const meta = raw.content[key].buildMeta;
      return (
        meta &&
        meta.exportsType !== 'namespace' &&
        meta.defaultObject !== 'redirect' &&
        meta.defaultObject !== 'redirect-warn'
      );
    });
    expect(otherKeys.length).toBeGreaterThan(0);
    for (const key of otherKeys) {
      expect(sanitized.content[key].buildMeta).toBeUndefined();
    }
  });
});
