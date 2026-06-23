/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { INFRA_DEP_MAP } from '../../lib/service_graph_logs/constants';
import type { InfraDependency } from '../../lib/service_graph_logs/constants';
import type { ServiceNode } from '../../lib/service_graph_logs/types';
import { CLAIMS_APP } from './mock_apps/claims';
import { deriveAppVariant } from './derive_app_variant';

const CLAIMS_SWAPPABLE: InfraDependency[] = ['mongodb', 'elasticsearch'];

// The variant intentionally preserves the base's narrow generic, which hides the
// runtime-added `displayName` and widened `infraDeps`. View nodes as `ServiceNode`
// for inspection.
const baseNodes = CLAIMS_APP.serviceGraph.services as readonly ServiceNode[];
const variantNodes = (seed: number, swappableDeps?: InfraDependency[]): ServiceNode[] =>
  deriveAppVariant(CLAIMS_APP, seed, { swappableDeps }).serviceGraph.services as ServiceNode[];

const categoryOf = (dep: InfraDependency): string =>
  Object.entries(INFRA_DEP_MAP).find(([, e]) =>
    (e.tech as readonly InfraDependency[]).includes(dep)
  )![0];

describe('deriveAppVariant', () => {
  describe('determinism (invariant 1) and purity (invariant 6)', () => {
    it('produces a byte-identical variant for the same seed', () => {
      const a = deriveAppVariant(CLAIMS_APP, 42, { swappableDeps: CLAIMS_SWAPPABLE });
      const b = deriveAppVariant(CLAIMS_APP, 42, { swappableDeps: CLAIMS_SWAPPABLE });
      expect(a.serviceGraph).toEqual(b.serviceGraph);
    });

    it('differs from a neighbouring seed in at least one displayName or runtime', () => {
      const a = variantNodes(42);
      const b = variantNodes(43);
      const differs = a.some(
        (svc, i) => svc.displayName !== b[i].displayName || svc.runtime !== b[i].runtime
      );
      expect(differs).toBe(true);
    });
  });

  describe('structural identity preserved (invariant 2)', () => {
    it('keeps the exact set of service names', () => {
      const variantNames = variantNodes(7)
        .map((s) => s.name)
        .sort();
      const baseNames = baseNodes.map((s) => s.name).sort();
      expect(variantNames).toEqual(baseNames);
    });

    it('leaves the edge set and entryService untouched', () => {
      const variant = deriveAppVariant(CLAIMS_APP, 7);
      expect(variant.serviceGraph.edges).toEqual(CLAIMS_APP.serviceGraph.edges);
      expect(variant.entryService).toEqual(CLAIMS_APP.entryService);
    });

    it('sets a distinct displayName on every service while preserving name', () => {
      variantNodes(7).forEach((svc) => {
        expect(svc.displayName).toBeDefined();
        expect(svc.displayName).toContain(svc.name);
        expect(svc.displayName).not.toEqual(svc.name);
      });
    });
  });

  describe('referential integrity (invariant 3)', () => {
    it('every edge endpoint and the entry service exist in services', () => {
      const variant = deriveAppVariant(CLAIMS_APP, 13);
      const names = new Set<string>(variant.serviceGraph.services.map((s) => s.name));
      variant.serviceGraph.edges.forEach((edge) => {
        expect(names.has(edge.source)).toBe(true);
        expect(names.has(edge.target)).toBe(true);
      });
      expect(names.has(variant.entryService)).toBe(true);
    });
  });

  describe('floor preserved (invariant 4)', () => {
    it.each([1, 2, 3, 42, 99, 1000])('clears the per-stream floor for seed %i', (seed) => {
      const services = variantNodes(seed, CLAIMS_SWAPPABLE);

      expect(services.length).toBeGreaterThanOrEqual(4);
      expect(new Set(services.map((s) => s.runtime)).size).toBeGreaterThanOrEqual(2);

      const totalDeps = services.reduce((acc, s) => acc + s.infraDeps.length, 0);
      expect(totalDeps).toBeGreaterThanOrEqual(3);

      services.forEach((svc) => {
        // deps distinct within a service
        expect(new Set(svc.infraDeps).size).toBe(svc.infraDeps.length);
      });
    });
  });

  describe('dep-swap safety (invariant 5)', () => {
    it('never changes a protected (non-swappable) dep', () => {
      // postgres is referenced by db_timeout incidents → must be omitted from swappable.
      for (const seed of [1, 2, 3, 42, 99, 1000]) {
        const services = variantNodes(seed, CLAIMS_SWAPPABLE);
        baseNodes.forEach((baseSvc, i) => {
          if (baseSvc.infraDeps.includes('postgres')) {
            expect(services[i].infraDeps).toContain('postgres');
          }
        });
      }
    });

    it('keeps swaps within the original category', () => {
      const services = variantNodes(42, CLAIMS_SWAPPABLE);
      baseNodes.forEach((baseSvc, i) => {
        services[i].infraDeps.forEach((dep, j) => {
          const baseDep = baseSvc.infraDeps[j];
          if (baseDep !== undefined) {
            expect(categoryOf(dep)).toEqual(categoryOf(baseDep));
          }
        });
      });
    });

    it('does not touch deps when no swappableDeps are provided', () => {
      const services = variantNodes(42);
      baseNodes.forEach((baseSvc, i) => {
        expect(services[i].infraDeps).toEqual(baseSvc.infraDeps);
      });
    });
  });
});
