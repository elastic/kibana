/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { performance } from 'perf_hooks';
import { withActiveSpan } from '@kbn/tracing-utils';
import type { DrinkType, DrinkSize, OrderRequest, OrderResult, OrderOutcome } from '../../common';
import { MENU, SIZE_MULTIPLIER } from './menu';
import { activeOrders, orderDuration } from '../metrics';

/**
 * ☕ SOLUTION — fully instrumented version of the workshop pipeline.
 *
 * Compare this against the blank version on the `eah-otel-workshop` branch to see exactly
 * what Tier 1 (metrics) and Tier 3 (traces) add.
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

// Tier 3: each stage is its own child span. `withActiveSpan` ends the span and records any
// thrown exception (ERROR status) for us — note there's no try/catch here.
const grindBeans = (drink: DrinkType, size: DrinkSize): Promise<void> =>
  withActiveSpan('grind_beans', async () => {
    await delay(MENU[drink].grindMs * SIZE_MULTIPLIER[size]);
    maybeFail(drink, 'the grinder jammed', GRIND_FAILURE_RATE);
  });

const brew = (drink: DrinkType, size: DrinkSize): Promise<number> =>
  withActiveSpan('brew', async () => {
    await delay(MENU[drink].brewMs * SIZE_MULTIPLIER[size]);
    maybeFail(drink, 'out of beans', BREW_FAILURE_RATE);
    return Math.round(MENU[drink].baseShots * SIZE_MULTIPLIER[size]);
  });

const garnish = (drink: DrinkType, size: DrinkSize): Promise<void> =>
  withActiveSpan('garnish', async () => {
    await delay(MENU[drink].garnishMs * SIZE_MULTIPLIER[size]);
    maybeFail(drink, 'spilled the milk', GARNISH_FAILURE_RATE);
  });

/**
 * Brew a single order. Throws if any stage fails (the route turns that into an HTTP error).
 */
export async function processOrder(order: OrderRequest): Promise<OrderResult> {
  const id = `order-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const { drink, size } = order;
  const start = performance.now();

  // Tier 1: an order just entered the pipeline.
  activeOrders.add(1);

  let outcome: OrderOutcome = 'success';

  try {
    // Tier 3: a parent span for the whole order. It auto-nests under the route's request span.
    return await withActiveSpan(
      'process_order',
      { attributes: { 'coffee.drink': drink, 'coffee.size': size } },
      async (span) => {
        await grindBeans(drink, size);
        const shots = await brew(drink, size);
        span?.setAttribute('coffee.shots', shots);
        await garnish(drink, size);

        return {
          id,
          drink,
          size,
          outcome,
          shots,
          durationMs: Math.round(performance.now() - start),
        };
      }
    );
  } catch (e) {
    outcome = 'failure';
    throw e;
  } finally {
    const durationMs = Math.round(performance.now() - start);

    // Tier 1: record the duration (runs on success AND failure), then mark the order as gone.
    orderDuration.record(durationMs, { 'coffee.drink': drink, outcome });
    activeOrders.add(-1);
  }
}
