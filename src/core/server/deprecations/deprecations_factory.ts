/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DeprecationsRegistry } from './deprecations_registry';
import type { Logger } from '../logging';
import type {
  PluginDeprecationDetails,
  DeprecationsDetails,
  DeprecationDependencies,
} from './types';

export interface DeprecationsFactoryDeps {
  logger: Logger;
}

export class DeprecationsFactory {
  private readonly registries: Map<string, DeprecationsRegistry> = new Map();
  private readonly logger: Logger;
  constructor({ logger }: DeprecationsFactoryDeps) {
    this.logger = logger;
  }

  public createRegistry = (pluginId: string): DeprecationsRegistry => {
    const exsiting = this.registries.get(pluginId);
    if (exsiting) {
      return exsiting;
    }
    const registry = new DeprecationsRegistry();
    this.registries.set(pluginId, registry);
    return registry;
  };

  public getRegistry = (pluginId: string): DeprecationsRegistry | undefined => {
    return this.registries.get(pluginId);
  };

  public getDeprecations = async (
    pluginId: string,
    dependencies: DeprecationDependencies
  ): Promise<PluginDeprecationDetails[]> => {
    const infoBody = await this.getDeprecationsBody(pluginId, dependencies);
    return this.createDeprecationInfo(pluginId, infoBody).flat();
  };

  public getAllDeprecations = async (
    dependencies: DeprecationDependencies
  ): Promise<PluginDeprecationDetails[]> => {
    const pluginIds = [...this.registries.keys()];

    const deprecationsInfo = await Promise.all(
      pluginIds.map(async (pluginId) => {
        const infoBody = await this.getDeprecationsBody(pluginId, dependencies);
        return this.createDeprecationInfo(pluginId, infoBody);
      })
    );

    return deprecationsInfo.flat();
  };

  private createDeprecationInfo = (
    pluginId: string,
    deprecationInfoBody: DeprecationsDetails[]
  ): PluginDeprecationDetails[] => {
    return deprecationInfoBody
      .flat()
      .filter(Boolean)
      .map((pluginDeprecation) => ({
        ...pluginDeprecation,
        pluginId,
      }));
  };

  private getDeprecationsBody = async (
    pluginId: string,
    dependencies: DeprecationDependencies
  ): Promise<DeprecationsDetails[]> => {
    const deprecationsRegistry = this.registries.get(pluginId);
    if (!deprecationsRegistry) {
      return [];
    }
    try {
      const settledResults = await deprecationsRegistry.getDeprecations(dependencies);
      return settledResults.flatMap((settledResult) => {
        if (settledResult.status === 'rejected') {
          this.logger.warn(
            `Failed to get deprecations info for plugin "${pluginId}".`,
            settledResult.reason
          );
          return [
            {
              message: `Failed to get deprecations info for plugin "${pluginId}".`,
              level: 'warning',
              correctionActions: {
                manualSteps: ['Check Kibana server logs for error message.'],
              },
            },
          ];
        }

        return settledResult.value;
      });
    } catch (err) {
      this.logger.warn(`Failed to get deprecations info for plugin "${pluginId}".`, err);
      return [];
    }
  };
}
