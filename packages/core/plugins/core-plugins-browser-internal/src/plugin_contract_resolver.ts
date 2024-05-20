/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { PluginName } from '@kbn/core-base-common';
import type {
  PluginContractResolverResponse,
  PluginContractMap,
  PluginContractResolverResponseItem,
} from '@kbn/core-plugins-contracts-browser';

export type IRuntimePluginContractResolver = PublicMethodsOf<RuntimePluginContractResolver>;

export class RuntimePluginContractResolver {
  private dependencyMap?: Map<PluginName, Set<PluginName>>;
  private setupContracts?: Map<PluginName, unknown>;
  private startContracts?: Map<PluginName, unknown>;

  private readonly setupRequestQueue: PluginContractRequest[] = [];
  private readonly startRequestQueue: PluginContractRequest[] = [];

  setDependencyMap(depMap: Map<PluginName, Set<PluginName>>) {
    this.dependencyMap = new Map(depMap.entries());
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
    } else {
      const startContractRequest = createPluginContractRequest<PluginContractResolverResponse<T>>(
        dependencyNames as PluginName[]
      );
      this.startRequestQueue.push(startContractRequest as PluginContractRequest);
      return startContractRequest.contractPromise;
    }
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
