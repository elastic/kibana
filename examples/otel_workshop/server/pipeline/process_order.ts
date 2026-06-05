/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { performance } from 'perf_hooks';
import { metrics, ValueType } from '@opentelemetry/api';
import type { DrinkType, DrinkSize, OrderRequest, OrderResult, OrderOutcome } from '../../common';
import { MENU, SIZE_MULTIPLIER } from './menu';

/**
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  ☕  THE WORKSHOP EXERCISE LIVES IN THIS FILE.                            │
 * │                                                                           │
 * │  `processOrder` runs a coffee order through three stages — grind → brew   │
 * │  → garnish — each with a little latency and a chance of failing. It is    │
 * │  fully working but completely UN-instrumented. Your job is to add:        │
 * │                                                                           │
 * │   • Tier 1 (metrics): an in-flight UpDownCounter + a duration Histogram.  │
 * │   • Tier 3 (traces):  wrap the pipeline + each stage in `withActiveSpan`. │
 * │                                                                           │
 * │  Look for the `// @otel:` and `// TODO(Tier N):` markers below. The       │
 * │  README walks through each one. (Tier 2 — observable metrics — is an      │
 * │  optional appendix exercise; it is not wired here.)                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

// Chance each stage fails. Tuned so most orders succeed but enough fail to make
// the `outcome` attribute and the error spans interesting.
const GRIND_FAILURE_RATE = 0.05;
const BREW_FAILURE_RATE = 0.15;
const GARNISH_FAILURE_RATE = 0.05;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const maybeFail = (drink: DrinkType, reason: string, rate: number): void => {
  if (Math.random() < rate) {
    throw new Error(`${drink}: ${reason}`);
  }
};

const grindBeans = async (drink: DrinkType, size: DrinkSize): Promise<void> => {
  // TODO(Tier 3): wrap this stage's body in a child `grind_beans` span.
  await delay(MENU[drink].grindMs * SIZE_MULTIPLIER[size]);
  maybeFail(drink, 'the grinder jammed', GRIND_FAILURE_RATE);
};

const brew = async (drink: DrinkType, size: DrinkSize): Promise<number> => {
  // TODO(Tier 3): wrap this stage's body in a child `brew` span.
  await delay(MENU[drink].brewMs * SIZE_MULTIPLIER[size]);
  maybeFail(drink, 'out of beans', BREW_FAILURE_RATE);
  return Math.round(MENU[drink].baseShots * SIZE_MULTIPLIER[size]);
};

const garnish = async (drink: DrinkType, size: DrinkSize): Promise<void> => {
  // TODO(Tier 3): wrap this stage's body in a child `garnish` span.
  await delay(MENU[drink].garnishMs * SIZE_MULTIPLIER[size]);
  maybeFail(drink, 'spilled the milk', GARNISH_FAILURE_RATE);
};

/**
 * Brew a single order. Throws if any stage fails (the route turns that into an HTTP error).
 */
export async function processOrder(order: OrderRequest): Promise<OrderResult> {
  const id = `order-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const { drink, size } = order;
  const start = performance.now();

  // @otel: kibana.otel_workshop.order.active
  // TODO(Tier 1): an order just entered the pipeline — increment the in-flight UpDownCounter by +1.

  let outcome: OrderOutcome = 'success';

  try {
    // TODO(Tier 3): wrap everything in this try block in a parent `process_order` span,
    //               with attributes { 'coffee.drink': drink, 'coffee.size': size }.
    await grindBeans(drink, size);
    const shots = await brew(drink, size);
    // TODO(Tier 3): set a `coffee.shots` attribute on the `process_order` span here.
    await garnish(drink, size);

    return { id, drink, size, outcome, shots, durationMs: Math.round(performance.now() - start) };
  } catch (e) {
    outcome = 'failure';
    throw e;
  } finally {
    const durationMs = Math.round(performance.now() - start);

    // @otel: kibana.otel_workshop.order.duration { 'coffee.drink': drink, outcome }
    // TODO(Tier 1): record the order `durationMs` on the duration Histogram (runs on success AND failure).
    void durationMs;

    // @otel: kibana.otel_workshop.order.active
    // TODO(Tier 1): the order just left the pipeline — decrement the in-flight UpDownCounter by -1.
    //               (Must run on success AND failure — that is why it lives in `finally`.)
  }
}

// We might control this dynamically in the plugin in the future,
// so that the utilization varies as well based on the number of baristas.
const baristas = 1;

// Report the number of baristas actively working in the Coffee shop
metrics
  .getMeter('kibana.otel_workshop')
  .createObservableUpDownCounter('kibana.otel_workshop.baristas.active', {
    description: 'Number of baristas currently working.',
    unit: '{barista}',
    valueType: ValueType.INT,
  })
  .addCallback((result) => {
    result.observe(baristas);
  });
