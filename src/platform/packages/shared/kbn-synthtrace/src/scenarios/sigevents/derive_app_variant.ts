/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * `deriveAppVariant` — produces a coherent, within-archetype variant of a mock
 * application so the scalability fleet can reach ~50 genuinely-distinct streams
 * from ~8 hand-authored archetypes. See the design contract:
 * `aj/performance and scalability/scalability/r5-derive-app-variant-contract.md`.
 *
 * v1 varies only attribute-level fields whose types are invariant under the
 * service-graph generic: service `displayName` (the emitted `service.name`, hence
 * the `entity` KI), `runtime` (the `technology` KI), optional in-category infra
 * dep swaps (the `infrastructure`/`dependency` KIs), `version`, and the k8s
 * namespace label. It NEVER touches the structural `name`, the edge set, the
 * `scenarios` map, or `entryService` — so no edge or incident can break. Pure and
 * fully `mulberry32(seed)`-driven: a `seed` reproduces an exact variant.
 */

import { INFRA_DEP_MAP } from '../../lib/service_graph_logs/constants';
import type { InfraDependency, Runtime } from '../../lib/service_graph_logs/constants';
import { RUNTIMES } from '../../lib/service_graph_logs/constants';
import { mulberry32 } from '../../lib/service_graph_logs/placeholders';
import type { ServiceGraph } from '../../lib/service_graph_logs/types';
import type { MockAppDefinition } from './utils';

/** Curated, deployment-flavoured slugs — realistic instance identities, not noise. */
const VARIANT_TAGS = [
  'eu-west',
  'us-east',
  'apac',
  'us-central',
  'eu-north',
  'blue',
  'green',
  'canary',
  'cell-3',
  'cell-7',
  'shard-a',
  'shard-b',
] as const;

// Per-lever seed offsets so each lever's draws are independent of the others'
// (mirrors the engine's `LEVEL_RNG_SEED_OFFSET` convention).
const TAG_OFFSET = 0;
const RUNTIME_OFFSET = 101;
const DEP_OFFSET = 202;
const VERSION_OFFSET = 303;

/** Probability that a given service's runtime is swapped to a different one. */
const RUNTIME_SWAP_PROB = 0.6;

export interface DeriveAppVariantOptions {
  /**
   * Infra deps that may be swapped within their `INFRA_DEP_MAP` category (e.g.
   * postgres↔mongodb). Anything a failure scenario references MUST be omitted, or
   * the incident would target a dep that no longer exists. Defaults to `[]`.
   */
  swappableDeps?: InfraDependency[];
}

/** Picks an element from `pool` other than `current`; returns `current` if none. */
const pickOther = <TItem>(pool: readonly TItem[], current: TItem, rng: () => number): TItem => {
  const others = pool.filter((item) => item !== current);
  if (others.length === 0) return current;
  return others[Math.floor(rng() * others.length)];
};

/**
 * Swaps each swappable dep for a different tech in the same category, keeping the
 * dep count and ensuring the service's deps stay distinct. Protected (non-listed)
 * deps are left untouched.
 */
const swapDeps = (
  deps: InfraDependency[],
  swappable: ReadonlySet<InfraDependency>,
  rng: () => number
): InfraDependency[] => {
  const result = [...deps];
  for (let i = 0; i < result.length; i++) {
    const dep = result[i];
    if (!swappable.has(dep)) continue;

    const category = Object.values(INFRA_DEP_MAP).find((entry) =>
      (entry.tech as readonly InfraDependency[]).includes(dep)
    );
    if (!category) continue;

    const candidates = (category.tech as readonly InfraDependency[]).filter(
      (tech) => tech !== dep && !result.includes(tech)
    );
    if (candidates.length === 0) continue;

    result[i] = candidates[Math.floor(rng() * candidates.length)];
  }
  return result;
};

export const deriveAppVariant = <TServiceGraph extends ServiceGraph>(
  base: MockAppDefinition<TServiceGraph>,
  seed: number,
  opts: DeriveAppVariantOptions = {}
): MockAppDefinition<TServiceGraph> => {
  const tag = VARIANT_TAGS[Math.floor(mulberry32(seed + TAG_OFFSET)() * VARIANT_TAGS.length)];
  const runtimeRng = mulberry32(seed + RUNTIME_OFFSET);
  const depRng = mulberry32(seed + DEP_OFFSET);
  const versionRng = mulberry32(seed + VERSION_OFFSET);
  const swappable = new Set(opts.swappableDeps ?? []);

  const services = base.serviceGraph.services.map((svc) => {
    const runtime: Runtime =
      runtimeRng() < RUNTIME_SWAP_PROB ? pickOther(RUNTIMES, svc.runtime, runtimeRng) : svc.runtime;

    const deployment =
      svc.deployment?.k8s !== undefined
        ? {
            ...svc.deployment,
            k8s: { ...svc.deployment.k8s, namespace: `${svc.deployment.k8s.namespace}-${tag}` },
          }
        : svc.deployment;

    return {
      ...svc,
      displayName: `${svc.name}-${tag}`,
      runtime,
      infraDeps: swapDeps(svc.infraDeps, swappable, depRng),
      version: `1.${Math.floor(versionRng() * 9)}.${Math.floor(versionRng() * 9)}`,
      deployment,
    };
  });

  // Invariant: preserve ≥2 distinct runtimes (the `technology` KI floor). If the
  // random swaps collapsed the fleet to one runtime, flip the last service.
  if (new Set(services.map((svc) => svc.runtime)).size < 2 && services.length > 1) {
    const last = services[services.length - 1];
    last.runtime = pickOther(RUNTIMES, last.runtime, runtimeRng);
  }

  // `.map` cannot preserve the exact readonly-tuple identity of `TServiceGraph`,
  // so re-assert it here: the transform keeps every `name` and the edge set, so
  // the structural contract of `TServiceGraph` still holds at runtime.
  const serviceGraph = { ...base.serviceGraph, services } as TServiceGraph;

  return { ...base, serviceGraph };
};
