/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { KnownCapabilities } from './types';

/**
 * Zod schema per capability key. Used by StepDispatcher to parse each
 * declared capability at dispatch time. A parse failure surfaces as a
 * step.failed event with reason capability_validation.
 *
 * Note: proceedFn is validated as "present and callable" only — the call
 * signature is not verified at runtime. TypeScript narrowing via the
 * KnownCapabilities table provides compile-time safety at handler authoring
 * sites; do not oversell this as full signature verification.
 */
export const capabilitySchemas: {
  readonly [K in keyof KnownCapabilities]: z.ZodType<KnownCapabilities[K]>;
} = {
  proceedFn: z.custom<KnownCapabilities['proceedFn']>((v) => typeof v === 'function', {
    message: 'proceedFn must be a callable function',
  }),
  anonymizationContext: z.custom<KnownCapabilities['anonymizationContext']>(
    (v) => v != null && typeof v === 'object' && 'tokenMap' in v,
    { message: 'anonymizationContext must be an object with a tokenMap field' }
  ),
};
