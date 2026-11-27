/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Variant } from './types';
import { variantA } from './variants/a';
import { variantB } from './variants/b';

/** The experimental colors' variants. Their keys are the feature flag's values, besides `default`. */
export const VARIANTS = {
  A: variantA,
  B: variantB,
} as const satisfies Record<string, Variant>;

export type VariantId = keyof typeof VARIANTS;

export const isVariantId = (value: string): value is VariantId => Object.hasOwn(VARIANTS, value);
