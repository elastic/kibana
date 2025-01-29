/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PluginName } from '@kbn/core-base-common';
import {
  type CoreStatus,
  ServiceStatusLevels,
  type ServiceStatus,
  type ServiceStatusLevel,
} from '@kbn/core-status-common';
import type { NamedPluginStatus, NamedServiceStatus, PluginStatus } from './types';

interface GetSummaryStatusParams {
  serviceStatuses?: CoreStatus;
  pluginStatuses?: Record<PluginName, PluginStatus>;
}

/**
 * Returns a single {@link ServiceStatus} that summarizes the most severe status level from a group of statuses.
 */
export const getSummaryStatus = ({
  serviceStatuses,
  pluginStatuses,
}: GetSummaryStatusParams): ServiceStatus => {
  const { highestLevel, highestLevelServices, highestLevelPlugins } = highestLevelSummary({
    serviceStatuses,
    pluginStatuses,
  });

  if (highestLevel === ServiceStatusLevels.available) {
    return {
      level: ServiceStatusLevels.available,
      summary:
        serviceStatuses && pluginStatuses
          ? 'All services and plugins are available'
          : serviceStatuses
          ? 'All services are available'
          : 'All plugins are available',
    };
  } else {
    const failingPlugins = highestLevelPlugins?.filter(({ reported }) => reported);
    const affectedPlugins = highestLevelPlugins?.filter(({ reported }) => !reported);
    const failingServicesNames = highestLevelServices?.map(({ name }) => name);
    const failingPluginsNames = failingPlugins?.map(({ name }) => name);
    const affectedPluginsNames = affectedPlugins?.map(({ name }) => name);
    return {
      level: highestLevel,
      summary: getSummaryContent({
        level: highestLevel,
        services: failingServicesNames,
        plugins: failingPluginsNames,
      }),
      // TODO: include URL to status page
      detail: `See the status page for more information`,
      meta: {
        failingServices: failingServicesNames,
        failingPlugins: failingPluginsNames,
        affectedPlugins: affectedPluginsNames,
      },
    };
  }
};

interface GetSummaryContentParams {
  level: ServiceStatusLevel;
  services: string[];
  plugins: string[];
}

const getSummaryContent = ({ level, services, plugins }: GetSummaryContentParams): string => {
  const list = [...services, ...plugins].join(', ');
  return `${services.length} service(s) and ${
    plugins.length
  } plugin(s) are ${level.toString()}: ${list}`;
};

const highestLevelSummary = ({ serviceStatuses, pluginStatuses }: GetSummaryStatusParams) => {
  let highestServiceLevel: ServiceStatusLevel = ServiceStatusLevels.available;
  let highestPluginLevel: ServiceStatusLevel = ServiceStatusLevels.available;
  let highestLevelServices: NamedServiceStatus[] = [];
  let highestLevelPlugins: NamedPluginStatus[] = [];

  if (serviceStatuses) {
    let name: keyof CoreStatus;
    for (name in serviceStatuses) {
      if (Object.hasOwn(serviceStatuses, name)) {
        const namedStatus: NamedServiceStatus = { ...serviceStatuses[name], name };
        if (serviceStatuses[name].level === highestServiceLevel) {
          highestLevelServices.push(namedStatus);
        } else if (serviceStatuses[name].level > highestServiceLevel) {
          highestLevelServices = [namedStatus];
          highestServiceLevel = serviceStatuses[name].level;
        }
      }
    }
  }

  if (pluginStatuses) {
    Object.entries(pluginStatuses).forEach(([name, pluginStatus]) => {
      const namedStatus: NamedPluginStatus = { ...pluginStatus, name };
      if (pluginStatus.level === highestPluginLevel) {
        highestLevelPlugins.push(namedStatus);
      } else if (pluginStatus.level > highestPluginLevel) {
        highestLevelPlugins = [namedStatus];
        highestPluginLevel = pluginStatus.level;
      }
    });
  }

  if (highestServiceLevel === highestPluginLevel) {
    return { highestLevel: highestServiceLevel, highestLevelServices, highestLevelPlugins };
  } else if (highestServiceLevel > highestPluginLevel) {
    return { highestLevel: highestServiceLevel, highestLevelServices, highestLevelPlugins: [] };
  } else {
    return { highestLevel: highestPluginLevel, highestLevelServices: [], highestLevelPlugins };
  }
};
