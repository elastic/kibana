/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginName } from '@kbn/core-base-common';
import type { CoreSetup, CoreStart } from '@kbn/core-lifecycle-browser';
import { type Context, type Plugin } from '@kbn/cordis';
import type { PluginWrapper } from './plugin';

export interface BrowserAdapterHandle {
  readonly component: Plugin;
  readonly getContract: () => unknown;
  readonly getCapturedError: () => unknown;
}

/**
 * Creates a Cordis component that wraps the browser `PluginWrapper.setup()` lifecycle.
 *
 * Browser setup is synchronous; no timeout is applied.
 *
 * inject keys:
 *   - 'core.setup'                              — provided by driver before first fiber
 *   - '${dep}.setup' for each requiredPlugin    — provided by each dep's setup fiber on activation
 */
export const createBrowserSetupAdapter = ({
  plugin,
  plugins,
  setupContext,
  contracts,
}: {
  plugin: PluginWrapper;
  plugins: Map<PluginName, PluginWrapper>;
  setupContext: CoreSetup;
  contracts: Map<PluginName, unknown>;
}): BrowserAdapterHandle => {
  let capturedContract: unknown;
  let capturedError: unknown;

  const requiredSetupKeys = plugin.requiredPlugins
    .filter((dep) => plugins.has(dep))
    .map((dep) => `${dep}.setup`);

  const component: Plugin = {
    inject: ['core.setup', ...requiredSetupKeys],
    apply(ctx: Context) {
      try {
        const depContracts = buildBrowserDepContracts(plugin, contracts);
        const contract = plugin.setup(setupContext as any, depContracts as any);
        capturedContract = contract;
        ctx.provide(`${plugin.name}.setup`, { contract });

        // Wire plugin.stop() into the Cordis disposal chain for reverse-topological teardown.
        ctx.effect(() => async () => {
          try {
            await plugin.stop();
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn(`[Cordis] plugin "${plugin.name}" threw during stop:`, e);
          }
        });
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

/**
 * Creates a Cordis component that wraps the browser `PluginWrapper.start()` lifecycle.
 *
 * inject keys:
 *   - 'core.start'                              — provided by driver before first start fiber
 *   - 'core.setupComplete'                      — provided after all setup fibers pass
 *   - '${id}.setup'                             — self-gate: ensures setup fiber activated first
 *   - '${dep}.start' for each requiredPlugin    — provided by each dep's start fiber on activation
 */
export const createBrowserStartAdapter = ({
  plugin,
  plugins,
  startContext,
  startContracts,
}: {
  plugin: PluginWrapper;
  plugins: Map<PluginName, PluginWrapper>;
  startContext: CoreStart;
  startContracts: Map<PluginName, unknown>;
}): BrowserAdapterHandle => {
  let capturedContract: unknown;
  let capturedError: unknown;

  const requiredStartKeys = plugin.requiredPlugins
    .filter((dep) => plugins.has(dep))
    .map((dep) => `${dep}.start`);

  const component: Plugin = {
    inject: [
      'core.start',
      'core.setupComplete',
      `${plugin.name}.setup`,
      ...requiredStartKeys,
    ],
    apply(ctx: Context) {
      try {
        const depContracts = buildBrowserDepContracts(plugin, startContracts);
        const contract = plugin.start(startContext, depContracts as any);
        capturedContract = contract;
        ctx.provide(`${plugin.name}.start`, { contract });
        // Browser plugin.start() resolves startDependencies$ internally.
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

const buildBrowserDepContracts = (
  plugin: PluginWrapper,
  contracts: Map<PluginName, unknown>
): Record<PluginName, unknown> => {
  const deps = [...plugin.requiredPlugins, ...plugin.optionalPlugins];
  return Object.fromEntries(
    deps.filter((dep) => contracts.has(dep)).map((dep) => [dep, contracts.get(dep)])
  );
};
