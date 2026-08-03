/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSharedConfig } from './shared_config';
import {
  EMOTION_LABEL_FORMAT,
  TYPESCRIPT_CONFIG,
  REACT_CONFIG,
  CORE_JS_VERSION,
  BABEL_RUNTIME_VERSION,
} from './constants';

describe('getSharedConfig', () => {
  const config = getSharedConfig();

  it('returns an object with all expected top-level keys', () => {
    expect(Object.keys(config).sort()).toEqual([
      'babel',
      'emotion',
      'polyfills',
      'react',
      'styledComponents',
      'typescript',
    ]);
  });

  describe('typescript', () => {
    it('matches TYPESCRIPT_CONFIG values', () => {
      expect(config.typescript).toEqual({
        allowNamespaces: TYPESCRIPT_CONFIG.allowNamespaces,
        allowDeclareFields: TYPESCRIPT_CONFIG.allowDeclareFields,
        decoratorsLegacy: TYPESCRIPT_CONFIG.decoratorsLegacy,
      });
    });

    it('enables legacy decorators', () => {
      expect(config.typescript.decoratorsLegacy).toBe(true);
    });

    it('allows namespaces', () => {
      expect(config.typescript.allowNamespaces).toBe(true);
    });

    it('allows declare fields', () => {
      expect(config.typescript.allowDeclareFields).toBe(true);
    });
  });

  describe('react', () => {
    it('uses automatic runtime from REACT_CONFIG', () => {
      expect(config.react.runtime).toBe(REACT_CONFIG.runtime);
    });

    it('runtime is automatic', () => {
      expect(config.react.runtime).toBe('automatic');
    });
  });

  describe('emotion', () => {
    it('uses EMOTION_LABEL_FORMAT', () => {
      expect(config.emotion.labelFormat).toBe(EMOTION_LABEL_FORMAT);
    });

    it('label format contains [filename] and [local] substrings', () => {
      expect(config.emotion.labelFormat).toContain('[filename]');
      expect(config.emotion.labelFormat).toContain('[local]');
    });
  });

  describe('styledComponents', () => {
    it('patterns is an array of RegExp', () => {
      expect(Array.isArray(config.styledComponents.patterns)).toBe(true);
      for (const pattern of config.styledComponents.patterns) {
        expect(pattern).toBeInstanceOf(RegExp);
      }
    });
  });

  describe('polyfills', () => {
    it('has coreJsVersion matching CORE_JS_VERSION', () => {
      expect(config.polyfills.coreJsVersion).toBe(CORE_JS_VERSION);
    });
  });

  describe('babel', () => {
    it('has runtimeVersion matching BABEL_RUNTIME_VERSION', () => {
      expect(config.babel.runtimeVersion).toBe(BABEL_RUNTIME_VERSION);
    });
  });
});
