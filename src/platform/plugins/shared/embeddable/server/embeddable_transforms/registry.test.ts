/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDrilldownRegistry } from '../drilldowns/registry';
import { getEmbeddableServerRegistry } from './registry';

describe('getEmbeddableServerRegistry', () => {
  describe('getStateComparison', () => {
    it('returns the registered state comparison', () => {
      const registry = getEmbeddableServerRegistry(getDrilldownRegistry());
      const stateComparison = { comparators: { title: 'referenceEquality' as const } };
      registry.registerEmbeddableServerDefinition('test', { title: 'Test', stateComparison });

      expect(registry.getStateComparison('test')).toBe(stateComparison);
    });

    it('returns undefined for types without a state comparison', () => {
      const registry = getEmbeddableServerRegistry(getDrilldownRegistry());
      registry.registerEmbeddableServerDefinition('test', { title: 'Test' });

      expect(registry.getStateComparison('test')).toBeUndefined();
      expect(registry.getStateComparison('unknown')).toBeUndefined();
    });
  });
});
