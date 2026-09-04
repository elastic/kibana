/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { PluginName } from '@kbn/core-base-common';
import type {
  PluginContractResolverResponse,
  PluginContractMap,
  PluginContractResolverResponseItem,
} from '@kbn/core-plugins-contracts-server';
import type { DeferredInitEngine } from './deferred_init';

export type IRuntimePluginContractResolver = PublicMethodsOf<RuntimePluginContractResolver>;

export class RuntimePluginContractResolver {
  private dependencyMap?: Map<PluginName, Set<PluginName>>;
  private setupContracts?: Map<PluginName, unknown>;
  private startContracts?: Map<PluginName, unknown>;
  private deferredInitEngine?: DeferredInitEngine;

  private readonly setupRequestQueue: PluginContractRequest[] = [];
  private readonly startRequestQueue: PluginContractRequest[] = [];
  /**
   * Contracts for plugins whose `start()` has already returned, populated incrementally as
   * {@link PluginsSystem.startPlugins}'s loop progresses -- well before the whole loop (and
   * therefore {@link resolveStartRequests}) finishes. Without this, a plugin calling
   * `onStart`/`loadPluginContract` on an already-started dependency from its OWN `start()` would
   * deadlock: that request could only unblock once every plugin's `start()` had returned, which
   * can't happen until this very `start()` call returns first.
   */
  private readonly availableStartContracts = new Map<PluginName, unknown>();

  setDependencyMap(depMap: Map<PluginName, Set<PluginName>>) {
    this.dependencyMap = new Map(depMap.entries());
  }

  setDeferredInitEngine(engine: DeferredInitEngine) {
    this.deferredInitEngine = engine;
  }

  onSetup = <T extends PluginContractMap>(
    pluginName: PluginName,
    dependencyNames: Array<keyof T>
  ): Promise<PluginContractResolverResponse<T>> => {
    if (!this.dependencyMap) {
      throw new Error('onSetup cannot be called before setDependencyMap');
    }

    const dependencyList = this.dependencyMap.get(pluginName) ?? new Set();
    const notDependencyPlugins = dependencyNames.filter(
      (name) => !dependencyList.has(name as PluginName)
    );
    if (notDependencyPlugins.length) {
      throw new Error(
        'Dynamic contract resolving requires the dependencies to be declared in the plugin manifest.' +
          `Undeclared dependencies: ${notDependencyPlugins.join(', ')}`
      );
    }

    if (this.setupContracts) {
      const response = createContractRequestResponse(
        dependencyNames as PluginName[],
        this.setupContracts
      );
      return Promise.resolve(response as PluginContractResolverResponse<T>);
    } else {
      const setupContractRequest = createPluginContractRequest<PluginContractResolverResponse<T>>(
        dependencyNames as PluginName[]
      );
      this.setupRequestQueue.push(setupContractRequest as PluginContractRequest);
      return setupContractRequest.contractPromise;
    }
  };

  onStart = <T extends PluginContractMap>(
    pluginName: PluginName,
    dependencyNames: Array<keyof T>
  ): Promise<PluginContractResolverResponse<T>> => {
    if (!this.dependencyMap) {
      throw new Error('onStart cannot be called before setDependencyMap');
    }

    const dependencyList = this.dependencyMap.get(pluginName) ?? new Set();
    const notDependencyPlugins = dependencyNames.filter(
      (name) => !dependencyList.has(name as PluginName)
    );
    if (notDependencyPlugins.length) {
      throw new Error(
        'Dynamic contract resolving requires the dependencies to be declared in the plugin manifest.' +
          `Undeclared dependencies: ${notDependencyPlugins.join(', ')}`
      );
    }

    if (this.startContracts) {
      const response = createContractRequestResponse(
        dependencyNames as PluginName[],
        this.startContracts
      );
      return Promise.resolve(response as PluginContractResolverResponse<T>);
    }

    if ((dependencyNames as PluginName[]).every((name) => this.availableStartContracts.has(name))) {
      const response = createContractRequestResponse(
        dependencyNames as PluginName[],
        this.availableStartContracts
      );
      return Promise.resolve(response as PluginContractResolverResponse<T>);
    }

    const startContractRequest = createPluginContractRequest<PluginContractResolverResponse<T>>(
      dependencyNames as PluginName[]
    );
    this.startRequestQueue.push(startContractRequest as PluginContractRequest);
    return startContractRequest.contractPromise;
  };

  /**
   * Called once per plugin, right after its `start()` returns and before the whole
   * `startPlugins` loop finishes, so any queued {@link onStart}/{@link loadPluginContract}
   * request that was only waiting on this plugin resolves immediately instead of waiting for
   * {@link resolveStartRequests}.
   */
  notifyStartContractAvailable(pluginName: PluginName, contract: unknown): void {
    this.availableStartContracts.set(pluginName, contract);

    for (let i = this.startRequestQueue.length - 1; i >= 0; i--) {
      const request = this.startRequestQueue[i];
      if (request.pluginNames.every((name) => this.availableStartContracts.has(name))) {
        request.resolve(
          createContractRequestResponse(request.pluginNames, this.availableStartContracts)
        );
        this.startRequestQueue.splice(i, 1);
      }
    }
  }

  /**
   * Convenience wrapper around {@link onStart} for a single declared dependency: resolves once
   * the dependency has started, then — if that dependency opted into deferred initialization —
   * waits for its deferred init to complete before returning its (real, unwrapped) start contract.
   * Rejects with `DeferredInitializationError` if that deferred init fails.
   *
   * This is the third trigger path for deferred initialization: HTTP routes and the initializing
   * UI drive it via their own polling/gating, but a plugin consuming another plugin's start
   * contract in-process has no request to hang the trigger off of. This gives it an explicit,
   * typed way to wait.
   */
  loadPluginContract = async <T>(
    pluginName: PluginName,
    dependencyName: PluginName
  ): Promise<T> => {
    const response = await this.onStart<Record<PluginName, T>>(pluginName, [dependencyName]);
    const item = response[dependencyName];
    if (!item.found) {
      throw new Error(
        `Cannot load contract for plugin "${dependencyName}": it is missing, disabled, or has no start contract.`
      );
    }

    if (this.deferredInitEngine?.isRegistered(dependencyName)) {
      await this.deferredInitEngine.waitUntilAvailable(dependencyName);
    }

    return item.contract;
  };

  resolveSetupRequests(setupContracts: Map<PluginName, unknown>) {
    if (this.setupContracts) {
      throw new Error('resolveSetupRequests can only be called once');
    }
    this.setupContracts = setupContracts;

    for (const setupRequest of this.setupRequestQueue) {
      const response = createContractRequestResponse(setupRequest.pluginNames, setupContracts);
      setupRequest.resolve(response);
    }
  }

  resolveStartRequests(startContracts: Map<PluginName, unknown>) {
    if (this.startContracts) {
      throw new Error('resolveStartRequests can only be called once');
    }
    this.startContracts = startContracts;

    for (const startRequest of this.startRequestQueue) {
      const response = createContractRequestResponse(startRequest.pluginNames, startContracts);
      startRequest.resolve(response);
    }
  }
}

interface PluginContractRequest<T = unknown> {
  pluginNames: PluginName[];
  contractPromise: Promise<T>;
  resolve: (data?: T) => void;
}

const createPluginContractRequest = <T = unknown>(
  pluginNames: PluginName[]
): PluginContractRequest<T> => {
  let resolve!: (data?: T) => void;
  const contractPromise = new Promise<any>((_resolve) => {
    resolve = _resolve;
  });

  return {
    pluginNames,
    contractPromise,
    resolve,
  };
};

const createContractRequestResponse = <T extends PluginContractMap>(
  pluginNames: PluginName[],
  contracts: Map<string, unknown>
): PluginContractResolverResponse<T> => {
  const response = {} as Record<string, unknown>;
  for (const pluginName of pluginNames) {
    const pluginResponse: PluginContractResolverResponseItem = contracts.has(pluginName)
      ? {
          found: true,
          contract: contracts.get(pluginName)!,
        }
      : { found: false };
    response[pluginName] = pluginResponse;
  }

  return response as PluginContractResolverResponse<T>;
};
