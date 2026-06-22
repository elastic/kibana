/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Runtime store for the resolved configuration.
 *
 * This module acts as a lightweight singleton that bridges the `preAction`
 * hook in `cli.ts` (which calls `loadConfig`) and the command action handlers
 * in `factory.ts` (which include the resolved config in `ParsedResult`).
 *
 * The store is written once per CLI invocation, before any action handler runs.
 */

import type { ResolvedConfig } from './types'

let _config: ResolvedConfig | undefined

/**
 * Stores the resolved configuration for the current CLI invocation.
 * Called by the `preAction` hook in `cli.ts`.
 */
export function setResolvedConfig (config: ResolvedConfig): void {
  _config = config
}

/**
 * Returns the resolved configuration, or `undefined` if config loading has
 * not yet run or was not available (e.g. no config file found).
 * Called by `factory.ts` when building `ParsedResult`.
 */
export function getResolvedConfig (): ResolvedConfig | undefined {
  return _config
}

/** Resets the store to its initial state. Intended for test cleanup only. */
export function _testResetConfig(): void {
  _config = undefined
}
