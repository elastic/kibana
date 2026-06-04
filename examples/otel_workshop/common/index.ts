/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** POST a single order to brew. */
export const SUBMIT_ORDER_ROUTE_PATH = '/api/otel_workshop/order';

/** POST to brew a whole batch of random orders concurrently (the "generate load" button). */
export const BREW_BATCH_ROUTE_PATH = '/internal/otel_workshop/brew_batch';

/** The (bounded!) set of drinks on the menu. Keep this small — it doubles as a metric attribute. */
export const DRINK_TYPES = ['espresso', 'latte', 'cappuccino', 'cold_brew'] as const;
export type DrinkType = (typeof DRINK_TYPES)[number];

export const DRINK_SIZES = ['small', 'medium', 'large'] as const;
export type DrinkSize = (typeof DRINK_SIZES)[number];

export interface OrderRequest {
  drink: DrinkType;
  size: DrinkSize;
}

export type OrderOutcome = 'success' | 'failure';

export interface OrderResult {
  id: string;
  drink: DrinkType;
  size: DrinkSize;
  outcome: OrderOutcome;
  /** Espresso shots that went into the cup. */
  shots: number;
  /** Wall-clock time the pipeline took, in milliseconds. */
  durationMs: number;
}

export interface BatchSummary {
  requested: number;
  served: number;
  failed: number;
}
