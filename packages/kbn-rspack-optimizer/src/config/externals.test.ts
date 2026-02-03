/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as UiSharedDepsSrc from '@kbn/ui-shared-deps-src';
import { getExternals } from './externals';

/**
 * Tests to verify externals configuration is correct and in sync with
 * kbn-ui-shared-deps-src. This prevents:
 * 1. Duplicate bundling of shared dependencies
 * 2. Missing externals causing runtime errors
 * 3. Mismatches between RSPack and webpack shared deps
 */
describe('externals configuration', () => {
  const rspackExternals = getExternals();
  const sharedDepsExternals = UiSharedDepsSrc.externals;

  describe('RSPack externals match kbn-ui-shared-deps-src', () => {
    // Get all externals that should be in both (excluding RSPack-specific ones)
    const commonExternals = Object.keys(rspackExternals).filter(
      (key) =>
        // Exclude node: prefixed modules (RSPack-specific)
        !key.startsWith('node:') &&
        // Exclude Emotion JSX runtime (added for SWC, may not be in shared deps yet)
        !key.includes('jsx-runtime') &&
        !key.includes('jsx-dev-runtime')
    );

    for (const moduleName of commonExternals) {
      it(`"${moduleName}" should have matching global in shared deps`, () => {
        const rspackGlobal = rspackExternals[moduleName];
        const sharedDepsGlobal = sharedDepsExternals[moduleName];

        // The external should exist in shared deps
        expect(sharedDepsGlobal).toBeDefined();

        // The global variable should match
        expect(rspackGlobal).toBe(sharedDepsGlobal);
      });
    }
  });

  describe('critical singleton externals are defined', () => {
    // These modules MUST be externals to prevent duplicate instances
    const criticalSingletons = [
      'react',
      'react-dom',
      '@emotion/react',
      '@emotion/cache',
      'styled-components',
      'redux',
      'react-redux',
      '@reduxjs/toolkit',
    ];

    for (const moduleName of criticalSingletons) {
      it(`"${moduleName}" must be externalized (singleton)`, () => {
        expect(rspackExternals[moduleName]).toBeDefined();
        expect(rspackExternals[moduleName]).toContain('__kbnSharedDeps__');
      });
    }
  });

  describe('Emotion JSX runtime externals for SWC', () => {
    it('should externalize @emotion/react/jsx-runtime', () => {
      expect(rspackExternals['@emotion/react/jsx-runtime']).toBeDefined();
      expect(rspackExternals['@emotion/react/jsx-runtime']).toContain(
        'EmotionReactJsxRuntime'
      );
    });

    it('should externalize @emotion/react/jsx-dev-runtime', () => {
      expect(rspackExternals['@emotion/react/jsx-dev-runtime']).toBeDefined();
      expect(rspackExternals['@emotion/react/jsx-dev-runtime']).toContain(
        'EmotionReactJsxDevRuntime'
      );
    });

    it('Emotion JSX externals should use __kbnSharedDeps__ global', () => {
      expect(rspackExternals['@emotion/react/jsx-runtime']).toMatch(
        /^__kbnSharedDeps__\./
      );
      expect(rspackExternals['@emotion/react/jsx-dev-runtime']).toMatch(
        /^__kbnSharedDeps__\./
      );
    });
  });

  describe('EUI and related externals', () => {
    const euiExternals = [
      '@elastic/eui',
      '@elastic/eui-theme-borealis',
      '@elastic/charts',
    ];

    for (const moduleName of euiExternals) {
      it(`"${moduleName}" should be externalized`, () => {
        expect(rspackExternals[moduleName]).toBeDefined();
      });
    }
  });

  describe('Kibana package externals', () => {
    const kbnPackages = [
      '@kbn/i18n',
      '@kbn/i18n-react',
      '@kbn/ui-theme',
      '@kbn/monaco',
      '@kbn/es-query',
      '@kbn/std',
      '@kbn/datemath',
    ];

    for (const moduleName of kbnPackages) {
      it(`"${moduleName}" should be externalized`, () => {
        expect(rspackExternals[moduleName]).toBeDefined();
      });
    }
  });
});
