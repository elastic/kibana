/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSharedConfig } from '@kbn/transpiler-config';
import { getBrowserSwcConfig } from './browser';

const sharedConfig = getSharedConfig();

describe('getBrowserSwcConfig', () => {
  describe('default (development) configuration', () => {
    const config = getBrowserSwcConfig();

    it('uses inline source maps', () => {
      expect(config.sourceMaps).toBe('inline');
    });

    it('includes inline sources content', () => {
      expect(config.inlineSourcesContent).toBe(true);
    });

    it('does not minify', () => {
      expect(config.minify).toBe(false);
    });

    it('sets react development mode to true', () => {
      expect(config.jsc.transform.react?.development).toBe(true);
    });
  });

  describe('production configuration', () => {
    const config = getBrowserSwcConfig({ production: true });

    it('disables source maps', () => {
      expect(config.sourceMaps).toBe(false);
    });

    it('does not include inline sources content', () => {
      expect(config.inlineSourcesContent).toBe(false);
    });

    it('enables minification', () => {
      expect(config.minify).toBe(true);
    });

    it('sets react development mode to false', () => {
      expect(config.jsc.transform.react?.development).toBe(false);
    });
  });

  describe('invariant fields (same in dev and production)', () => {
    const devConfig = getBrowserSwcConfig();
    const prodConfig = getBrowserSwcConfig({ production: true });

    it('uses TypeScript parser with TSX and decorators', () => {
      for (const config of [devConfig, prodConfig]) {
        expect(config.jsc.parser).toEqual({
          syntax: 'typescript',
          tsx: true,
          decorators: true,
        });
      }
    });

    it('targets es2020 for browser builds', () => {
      expect(devConfig.jsc.target).toBe('es2020');
      expect(prodConfig.jsc.target).toBe('es2020');
    });

    it('keeps class names for debugging', () => {
      expect(devConfig.jsc.keepClassNames).toBe(true);
      expect(prodConfig.jsc.keepClassNames).toBe(true);
    });

    it('uses external helpers', () => {
      expect(devConfig.jsc.externalHelpers).toBe(true);
      expect(prodConfig.jsc.externalHelpers).toBe(true);
    });

    it('outputs ES modules', () => {
      expect(devConfig.module).toEqual({ type: 'es6', ignoreDynamic: true });
      expect(prodConfig.module).toEqual({ type: 'es6', ignoreDynamic: true });
    });

    it('enables decorator metadata', () => {
      expect(devConfig.jsc.transform.decoratorMetadata).toBe(true);
      expect(prodConfig.jsc.transform.decoratorMetadata).toBe(true);
    });

    it('uses Emotion JSX import source', () => {
      expect(devConfig.jsc.transform.react?.importSource).toBe('@emotion/react');
      expect(prodConfig.jsc.transform.react?.importSource).toBe('@emotion/react');
    });
  });

  describe('shared config delegation', () => {
    it('delegates legacyDecorator from shared typescript config', () => {
      const config = getBrowserSwcConfig();
      expect(config.jsc.transform.legacyDecorator).toBe(sharedConfig.typescript.decoratorsLegacy);
    });

    it('delegates react runtime from shared react config', () => {
      const config = getBrowserSwcConfig();
      expect(config.jsc.transform.react?.runtime).toBe(sharedConfig.react.runtime);
    });
  });
});
