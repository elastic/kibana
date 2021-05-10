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
  DomainDeprecationDetails,
  DeprecationsDetails,
  GetDeprecationsContext,
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

  public getRegistry = (domainId: string): DeprecationsRegistry => {
    const existing = this.registries.get(domainId);
    if (existing) {
      return existing;
    }
    const registry = new DeprecationsRegistry();
    this.registries.set(domainId, registry);
    return registry;
  };

  public getDeprecations = async (
    domainId: string,
    dependencies: GetDeprecationsContext
  ): Promise<DomainDeprecationDetails[]> => {
    const infoBody = await this.getDeprecationsBody(domainId, dependencies);
    return this.createDeprecationInfo(domainId, infoBody).flat();
  };

  public getAllDeprecations = async (
    dependencies: GetDeprecationsContext
  ): Promise<DomainDeprecationDetails[]> => {
    const domainIds = [...this.registries.keys()];

    const deprecationsInfo = await Promise.all(
      domainIds.map(async (domainId) => {
        const infoBody = await this.getDeprecationsBody(domainId, dependencies);
        return this.createDeprecationInfo(domainId, infoBody);
      })
    );

    return deprecationsInfo.flat();
  };

  private createDeprecationInfo = (
    domainId: string,
    deprecationInfoBody: DeprecationsDetails[]
  ): DomainDeprecationDetails[] => {
    return deprecationInfoBody
      .flat()
      .filter(Boolean)
      .map((pluginDeprecation) => ({
        ...pluginDeprecation,
        domainId,
      }));
  };

  private getDeprecationsBody = async (
    domainId: string,
    dependencies: GetDeprecationsContext
  ): Promise<DeprecationsDetails[]> => {
    const deprecationsRegistry = this.registries.get(domainId);
    if (!deprecationsRegistry) {
      return [];
    }
    try {
      const settledResults = await deprecationsRegistry.getDeprecations(dependencies);
      return settledResults.flatMap((settledResult) => {
        if (settledResult.status === 'rejected') {
          this.logger.warn(
            `Failed to get deprecations info for plugin "${domainId}".`,
            settledResult.reason
          );
          return [
            {
              message: `Failed to get deprecations info for plugin "${domainId}".`,
              level: 'fetch_error',
              correctiveActions: {
                manualSteps: ['Check Kibana server logs for error message.'],
              },
            },
          ];
        }

        return settledResult.value;
      });
    } catch (err) {
      this.logger.warn(`Failed to get deprecations info for plugin "${domainId}".`, err);
      return [];
    }
  };
}
