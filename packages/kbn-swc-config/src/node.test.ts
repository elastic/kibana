/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSharedConfig } from '@kbn/transpiler-config';
import { getNodeSwcConfig } from './node';

const sharedConfig = getSharedConfig();

describe('getNodeSwcConfig', () => {
  describe('default (development) configuration', () => {
    const config = getNodeSwcConfig();

    it('uses inline source maps', () => {
      expect(config.sourceMaps).toBe('inline');
    });

    it('includes inline sources content', () => {
      expect(config.inlineSourcesContent).toBe(true);
    });

    it('does not minify', () => {
      expect(config.minify).toBe(false);
    });
  });

  describe('production configuration', () => {
    const config = getNodeSwcConfig({ production: true });

    it('disables source maps', () => {
      expect(config.sourceMaps).toBe(false);
    });

    it('does not include inline sources content', () => {
      expect(config.inlineSourcesContent).toBe(false);
    });

    it('does not minify even in production', () => {
      expect(config.minify).toBe(false);
    });
  });

  describe('invariant fields (same in dev and production)', () => {
    const devConfig = getNodeSwcConfig();
    const prodConfig = getNodeSwcConfig({ production: true });

    it('uses TypeScript parser with TSX and decorators', () => {
      for (const config of [devConfig, prodConfig]) {
        expect(config.jsc.parser).toEqual({
          syntax: 'typescript',
          tsx: true,
          decorators: true,
        });
      }
    });

    it('targets es2022 for Node.js builds', () => {
      expect(devConfig.jsc.target).toBe('es2022');
      expect(prodConfig.jsc.target).toBe('es2022');
    });

    it('keeps class names', () => {
      expect(devConfig.jsc.keepClassNames).toBe(true);
      expect(prodConfig.jsc.keepClassNames).toBe(true);
    });

    it('uses external helpers', () => {
      expect(devConfig.jsc.externalHelpers).toBe(true);
      expect(prodConfig.jsc.externalHelpers).toBe(true);
    });

    it('outputs CommonJS modules', () => {
      expect(devConfig.module).toEqual({ type: 'commonjs', ignoreDynamic: true });
      expect(prodConfig.module).toEqual({ type: 'commonjs', ignoreDynamic: true });
    });

    it('enables decorator metadata', () => {
      expect(devConfig.jsc.transform.decoratorMetadata).toBe(true);
      expect(prodConfig.jsc.transform.decoratorMetadata).toBe(true);
    });

    it('does not include a React transform', () => {
      expect(devConfig.jsc.transform).not.toHaveProperty('react');
      expect(prodConfig.jsc.transform).not.toHaveProperty('react');
    });
  });

  describe('shared config delegation', () => {
    it('delegates legacyDecorator from shared typescript config', () => {
      const config = getNodeSwcConfig();
      expect(config.jsc.transform.legacyDecorator).toBe(sharedConfig.typescript.decoratorsLegacy);
    });
  });
});
