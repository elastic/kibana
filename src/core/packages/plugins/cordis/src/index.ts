/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * @kbn/cordis — sole re-export barrel for the `cordis` package.
 *
 * This is the ONLY file in the Kibana repository that is allowed to import
 * directly from 'cordis'. All other code must import from '@kbn/cordis'.
 * That single point of indirection means an rc API break, a vendoring
 * decision, or an ESM/CJS compatibility fix only ever touches this file.
 *
 * The ESLint rule `no-restricted-imports` (configured in the root .eslintrc)
 * enforces this constraint.
 *
 * IMPORTANT: `cordis@4` is ESM-only. Node 24 handles `require(esm)` natively
 * for this package because it contains no top-level `await` and its only
 * runtime dependency (`cosmokit`) has a CJS build. Jest 29 requires explicit
 * allowlisting in `jest-preset.js` `transformIgnorePatterns` so that Babel
 * can transpile `lib/index.js` to CJS during test runs.
 *
 * Verified behaviour that adapters depend on (lock in via @kbn/cordis.test.ts):
 *  - `Fiber.await()` resolves immediately when the fiber is PENDING with an
 *    unresolved `inject` — it does NOT wait for activation and does NOT throw.
 *  - `Fiber._reload()` catches plugin apply() errors and routes them to
 *    `ctx.logger.error`; they are invisible without a registered logger exporter.
 *  - `ctx.get(key)` cannot distinguish "provided as undefined" from "not provided".
 */

export {
  Context,
  Service,
  FiberState,
  CordisError,
  ValidationError,
  resolveConfig,
} from 'cordis';

export type {
  Fiber,
  Plugin,
  Inject,
  Disposable,
  Effect,
  EffectMeta,
} from 'cordis';
