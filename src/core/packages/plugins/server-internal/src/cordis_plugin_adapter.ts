/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { withTimeout, isPromise } from '@kbn/std';
import type { PluginName } from '@kbn/core-base-common';
import type { Logger } from '@kbn/logging';
import type { CorePreboot, CoreSetup, CoreStart } from '@kbn/core-lifecycle-server';
import { type Context, type Plugin } from '@kbn/cordis';
import type { PluginWrapper } from './plugin';

const SETUP_TIMEOUT_MS = 10_000;
const START_TIMEOUT_MS = 10_000;
const STOP_TIMEOUT_MS = 15_000;

export interface AdapterHandle {
  /** The Cordis component to pass to ctx.plugin(). */
  readonly component: Plugin;
  /** Reads the contract produced by setup/start after the fiber is ACTIVE. */
  readonly getContract: () => unknown;
  /** Reads any error thrown inside apply() so assertActive can re-throw it. */
  readonly getCapturedError: () => unknown;
}

/**
 * Creates a Cordis component that wraps the legacy `Plugin.setup()` lifecycle.
 *
 * inject keys:
 *   - 'core.setup'                              — provided by driver when core setup deps are ready
 *   - '${dep}.setup' for each requiredPlugin    — provided by each dep's setup fiber on activation
 *
 * When all inject keys resolve, apply() calls plugin.setup() (with a 10s timeout), then
 * ctx.provide('${id}.setup', { contract }) so dependent fibers can activate in turn.
 *
 * The driver reads the contract via getContract() after asserting the fiber is ACTIVE.
 */
export const createSetupAdapter = ({
  plugin,
  plugins,
  setupContext,
  contracts,
  isDevMode,
  log,
}: {
  plugin: PluginWrapper;
  plugins: Map<PluginName, PluginWrapper>;
  setupContext: CoreSetup | CorePreboot;
  contracts: Map<PluginName, unknown>;
  isDevMode: boolean;
  log: Logger;
}): AdapterHandle => {
  let capturedContract: unknown;
  let capturedError: unknown;

  const requiredSetupKeys = plugin.requiredPlugins
    .filter((dep) => plugins.has(dep) && plugins.get(dep)!.includesServerPlugin)
    .map((dep) => `${dep}.setup`);

  const component: Plugin = {
    inject: ['core.setup', ...requiredSetupKeys],
    async apply(ctx: Context) {
      try {
        const depContracts = buildDepContracts(plugin, contracts);
        const contractOrPromise = plugin.setup(setupContext as CoreSetup, depContracts as any);

        if (isPromise(contractOrPromise)) {
          if (isDevMode) {
            log.warn(
              `Plugin ${plugin.name} is using asynchronous setup lifecycle. Asynchronous plugins support will be removed in a later version.`
            );
          }
          const result = await withTimeout({
            promise: contractOrPromise,
            timeoutMs: SETUP_TIMEOUT_MS,
          });
          if (result.timedout) {
            throw new Error(
              `Setup lifecycle of "${plugin.name}" plugin wasn't completed in 10sec. Consider disabling the plugin and re-start.`
            );
          }
          capturedContract = result.value;
        } else {
          capturedContract = contractOrPromise;
        }

        // Publish the contract as a Cordis service so dependent fibers can activate.
        // Notification fires when this fiber transitions to ACTIVE (after apply returns).
        ctx.provide(`${plugin.name}.setup`, { contract: capturedContract });
      } catch (e) {
        capturedError = e;
        throw e; // Cordis marks this fiber FAILED; error goes to logger bridge too
      }
    },
  };

  return {
    component,
    getContract: () => capturedContract,
    getCapturedError: () => capturedError,
  };
};

/**
 * Creates a Cordis component that wraps the legacy `Plugin.start()` lifecycle.
 *
 * inject keys:
 *   - 'core.start'                              — provided by driver when core start deps are ready
 *   - 'core.setupComplete'                      — provided by driver after ALL setup fibers pass
 *   - '${id}.setup'                             — self-gate: ensures setup fiber activated first
 *   - '${dep}.start' for each requiredPlugin    — provided by each dep's start fiber on activation
 */
export const createStartAdapter = ({
  plugin,
  plugins,
  startContext,
  startContracts,
  isDevMode,
  log,
}: {
  plugin: PluginWrapper;
  plugins: Map<PluginName, PluginWrapper>;
  startContext: CoreStart;
  startContracts: Map<PluginName, unknown>;
  isDevMode: boolean;
  log: Logger;
}): AdapterHandle => {
  let capturedContract: unknown;
  let capturedError: unknown;

  const requiredStartKeys = plugin.requiredPlugins
    .filter((dep) => plugins.has(dep) && plugins.get(dep)!.includesServerPlugin)
    .map((dep) => `${dep}.start`);

  const component: Plugin = {
    inject: [
      'core.start',
      'core.setupComplete',
      `${plugin.name}.setup`,
      ...requiredStartKeys,
    ],
    async apply(ctx: Context) {
      try {
        const depContracts = buildDepContracts(plugin, startContracts);
        const contractOrPromise = plugin.start(startContext, depContracts as any);

        if (isPromise(contractOrPromise)) {
          if (isDevMode) {
            log.warn(
              `Plugin ${plugin.name} is using asynchronous start lifecycle. Asynchronous plugins support will be removed in a later version.`
            );
          }
          const result = await withTimeout({
            promise: contractOrPromise,
            timeoutMs: START_TIMEOUT_MS,
          });
          if (result.timedout) {
            throw new Error(
              `Start lifecycle of "${plugin.name}" plugin wasn't completed in 10sec. Consider disabling the plugin and re-start.`
            );
          }
          capturedContract = result.value;
        } else {
          capturedContract = contractOrPromise;
        }
        // Note: plugin.start() internally resolves startDependencies$ for legacy getStartServices().

        ctx.provide(`${plugin.name}.start`, { contract: capturedContract });
      } catch (e) {
        capturedError = e;
        throw e;
      }
    },
  };

  return {
    component,
    getContract: () => capturedContract,
    getCapturedError: () => capturedError,
  };
};

const buildDepContracts = (
  plugin: PluginWrapper,
  contracts: Map<PluginName, unknown>
): Record<PluginName, unknown> => {
  const deps = [...plugin.requiredPlugins, ...plugin.optionalPlugins];
  return Object.fromEntries(
    deps.filter((dep) => contracts.has(dep)).map((dep) => [dep, contracts.get(dep)])
  );
};

export { SETUP_TIMEOUT_MS, START_TIMEOUT_MS, STOP_TIMEOUT_MS };
