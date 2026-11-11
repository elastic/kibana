/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';

interface GeneratedStep {
  name: string;
  type: string;
  [key: string]: unknown;
}

const MAX_DEPTH = 3;
const DEEP_MAX_DEPTH = 4;
const MAX_STEPS = 16;
const TRIGGER_TYPES = ['manual', 'alert', 'scheduled'] as const;

const PARK_MILLER_MODULUS = 2147483647;
const PARK_MILLER_MULTIPLIER = 48271;
// Park-Miller outputs are linear in the seed, so consecutive seeds would start
// with near-identical draws. Spread the seed first, then discard a few draws.
const SEED_SPREAD = 2654435761;
const WARM_UP_DRAWS = 4;

/** Small deterministic PRNG, so a failing seed reproduces the same workflow everywhere. */
const createRng = (seed: number): (() => number) => {
  let state = ((seed * SEED_SPREAD) % (PARK_MILLER_MODULUS - 1)) + 1;
  const next = (): number => {
    state = (state * PARK_MILLER_MULTIPLIER) % PARK_MILLER_MODULUS;
    return (state - 1) / (PARK_MILLER_MODULUS - 1);
  };
  for (let i = 0; i < WARM_UP_DRAWS; i++) next();
  return next;
};

/** Longer than the 24 characters an edge label shows, like the UUID case labels of real workflows. */
const LONG_CASE_LABEL = 'f4f436c8-5c4a-4f61-b0cc-9e0d2a7b1c35';

/**
 * Generates a workflow covering `if` (with either branch optional), `switch`
 * (up to 8 cases, some empty or with long labels, default optional), `parallel`
 * (some branches empty), `foreach`, and `on-failure` fallbacks with and without
 * `continue`, nested up to three levels (four for about a quarter of workflows) and
 * kept small enough that a whole corpus lays out in a few seconds.
 *
 * Pure: the same seed always yields the same workflow.
 */
export const generateWorkflow = (seed: number): WorkflowYaml => {
  const rng = createRng(seed);
  const int = (min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));
  const chance = (probability: number): boolean => rng() < probability;
  let stepCount = 0;
  const maxDepth = chance(0.25) ? DEEP_MAX_DEPTH : MAX_DEPTH;

  const nextName = (): string => {
    const name = `step_${stepCount}`;
    stepCount += 1;
    return name;
  };

  const sequence = (depth: number, length: number): GeneratedStep[] =>
    Array.from({ length }, () => step(depth));

  const bodyLength = (): number => int(1, 2);

  const withFallback = (generated: GeneratedStep, depth: number): GeneratedStep => {
    if (depth >= maxDepth || stepCount >= MAX_STEPS || !chance(0.2)) return generated;
    return {
      ...generated,
      'on-failure': {
        fallback: sequence(depth + 1, bodyLength()),
        ...(chance(0.4) ? { continue: true } : {}),
      },
    };
  };

  const step = (depth: number): GeneratedStep => {
    const name = nextName();
    if (depth >= maxDepth || stepCount >= MAX_STEPS) {
      return { name, type: 'http' };
    }

    const roll = rng();
    if (roll < 0.35) {
      return withFallback({ name, type: 'http' }, depth);
    }
    if (roll < 0.6) {
      const hasThen = chance(0.85);
      const thenSteps = hasThen ? sequence(depth + 1, bodyLength()) : [];
      const elseSteps = !hasThen || chance(0.6) ? sequence(depth + 1, bodyLength()) : [];
      return withFallback(
        {
          name,
          type: 'if',
          condition: 'true',
          steps: thenSteps,
          ...(elseSteps.length > 0 ? { else: elseSteps } : {}),
        },
        depth
      );
    }
    if (roll < 0.75) {
      const cases = Array.from({ length: chance(0.2) ? int(6, 8) : int(1, 3) }, (_, index) => ({
        match: chance(0.15) ? `${LONG_CASE_LABEL}_${index}` : `case_${index}`,
        steps: chance(0.12) ? [] : sequence(depth + 1, bodyLength()),
      }));
      return withFallback(
        {
          name,
          type: 'switch',
          expression: 'value',
          cases,
          ...(chance(0.5) ? { default: sequence(depth + 1, bodyLength()) } : {}),
        },
        depth
      );
    }
    if (roll < 0.87) {
      const branches = Array.from({ length: int(2, 3) }, (_, index) => ({
        name: `branch_${index}`,
        steps: chance(0.15) ? [] : sequence(depth + 1, bodyLength()),
      }));
      return withFallback({ name, type: 'parallel', branches }, depth);
    }
    return withFallback(
      { name, type: 'foreach', foreach: 'items', steps: sequence(depth + 1, bodyLength()) },
      depth
    );
  };

  const triggers = Array.from({ length: int(1, 3) }, (_, index) => ({
    type: TRIGGER_TYPES[index],
    enabled: true,
  }));

  return {
    name: `generated_${seed}`,
    enabled: true,
    triggers,
    steps: sequence(0, int(1, 4)),
  } as unknown as WorkflowYaml;
};
