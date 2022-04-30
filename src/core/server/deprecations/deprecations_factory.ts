/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { DeprecationsRegistry } from './deprecations_registry';
import type { Logger } from '../logging';
import type {
  DomainDeprecationDetails,
  DeprecationsDetails,
  GetDeprecationsContext,
} from './types';

export interface DeprecationsFactoryDeps {
  logger: Logger;
  config: DeprecationsFactoryConfig;
}

export interface DeprecationsFactoryConfig {
  ignoredConfigDeprecations: string[];
}

export class DeprecationsFactory {
  private readonly registries: Map<string, DeprecationsRegistry> = new Map();
  private readonly logger: Logger;
  private readonly config: DeprecationsFactoryConfig;

  constructor({ logger, config }: DeprecationsFactoryDeps) {
    this.logger = logger;
    this.config = config;
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
    return this.createDeprecationInfo(domainId, infoBody);
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
    return deprecationInfoBody.map((pluginDeprecation) => ({
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
              title: i18n.translate('core.deprecations.deprecations.fetchFailedTitle', {
                defaultMessage: `Failed to fetch deprecations for {domainId}`,
                values: { domainId },
              }),
              message: i18n.translate('core.deprecations.deprecations.fetchFailedMessage', {
                defaultMessage: 'Unable to fetch deprecations info for plugin {domainId}.',
                values: { domainId },
              }),
              level: 'fetch_error',
              correctiveActions: {
                manualSteps: [
                  i18n.translate(
                    'core.deprecations.deprecations.fetchFailed.manualStepOneMessage',
                    {
                      defaultMessage: 'Check Kibana server logs for error message.',
                    }
                  ),
                ],
              },
            },
          ];
        }

        return filterIgnoredDeprecations(settledResult.value.flat(), this.config);
      });
    } catch (err) {
      this.logger.warn(`Failed to get deprecations info for plugin "${domainId}".`, err);
      return [];
    }
  };
}

const filterIgnoredDeprecations = (
  deprecations: DeprecationsDetails[],
  config: DeprecationsFactoryConfig
): DeprecationsDetails[] => {
  return deprecations.filter((deprecation) => {
    if (deprecation.deprecationType === 'config') {
      return !config.ignoredConfigDeprecations.includes(deprecation.configPath);
    }
    return true;
  });
};
