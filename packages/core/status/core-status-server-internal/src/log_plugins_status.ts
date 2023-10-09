/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { pairwise, takeUntil, map, filter, startWith } from 'rxjs/operators';
import type { PluginName } from '@kbn/core-base-common';
import { ServiceStatus, ServiceStatusLevels } from '@kbn/core-status-common';

export type ServiceStatusWithName = ServiceStatus & {
  pluginName: PluginName;
};

export type PluginStatus = 'unavailable' | 'critical' | 'degraded' | 'available';
export type PluginsByStatus = Record<PluginStatus, ServiceStatusWithName[]>;

export interface PluginStatusChanges {
  status: PluginsByStatus;
  updates: PluginsByStatus;
  updated: number;
  total: number;
}

export const getPluginsStatusChanges = (
  plugins$: Observable<Record<PluginName, ServiceStatus>>,
  stop$: Observable<void>
): Observable<PluginStatusChanges> => {
  return plugins$.pipe(
    startWith({}), // consider all plugins unavailable by default
    takeUntil(stop$),
    pairwise(),
    map(([oldStatus, newStatus]) => getPluginsStatusDiff(oldStatus, newStatus)),
    filter((statusChanges) => statusChanges.updated > 0)
  );
};

const getPluginsStatusDiff = (
  previous: Record<PluginName, ServiceStatus>,
  next: Record<PluginName, ServiceStatus>
): PluginStatusChanges => {
  let updated: number = 0;
  const status: PluginsByStatus = {
    unavailable: [],
    critical: [],
    degraded: [],
    available: [],
  };
  const updates: PluginsByStatus = {
    unavailable: [],
    critical: [],
    degraded: [],
    available: [],
  };

  Object.entries(next).forEach(([pluginName, pluginStatus]) => {
    const currentLevel = pluginStatus.level;
    status[currentLevel.toString()].push({ pluginName, ...pluginStatus });
    const previousLevel = previous[pluginName]?.level ?? ServiceStatusLevels.unavailable;
    if (previousLevel !== pluginStatus.level) {
      // this plugin status has changed
      updates[currentLevel.toString()].push({
        pluginName,
        ...pluginStatus,
      } as ServiceStatusWithName);
      ++updated;
    }
  });

  return {
    status,
    updates,
    updated,
    total: Object.keys(next).length,
  };
};

export const getPluginStatusChangesMessages = ({
  status,
  updates,
  total,
}: PluginStatusChanges): string[] => {
  const messages: string[] = [];

  // loop through all different status levels, and report services that have changed
  Object.entries(updates).forEach(([currentLevel, pluginStatuses]) => {
    const statusReportingPlugins = pluginStatuses.filter(
      ({ isReportedStatus }) => isReportedStatus
    );

    const inferredCount = pluginStatuses.length - statusReportingPlugins.length;

    if (statusReportingPlugins.length === 1) {
      const reason = getReason(statusReportingPlugins[0]);
      const allAvailableSuffix =
        status.available.length === total ? ` (all ${total} plugins are now available)` : '';

      if (inferredCount === 0) {
        messages.push(
          `'${statusReportingPlugins[0].pluginName}' is now ${currentLevel}: ${reason}${allAvailableSuffix}`
        );
      } else {
        messages.push(
          `'${statusReportingPlugins[0].pluginName}' (and ${inferredCount} more) are now ${currentLevel}: ${reason}${allAvailableSuffix}`
        );
      }
    } else if (statusReportingPlugins.length > 1) {
      const multilineStatus = [];
      if (inferredCount === 0) {
        multilineStatus.push(
          `${
            statusReportingPlugins.length
          } plugins are now ${currentLevel}: ${statusReportingPlugins
            .map(({ pluginName }) => pluginName)
            .join(', ')}`
        );
      } else {
        multilineStatus.push(
          `The following plugins are now ${currentLevel}: ${statusReportingPlugins
            .map(({ pluginName }) => pluginName)
            .join(', ')} (and ${inferredCount} more)`
        );
      }

      statusReportingPlugins.forEach(({ pluginName, ...pluginStatus }) =>
        multilineStatus.push(
          ` - '${pluginName}' is now ${currentLevel}: ${getReason(pluginStatus)}`
        )
      );

      messages.push(multilineStatus.join('\n'));
    }
  });

  // report plugins that are STILL unhealthy (even though their status has not changed)
  Object.entries(status)
    .filter(([currentLevel]) => currentLevel !== ServiceStatusLevels.available.toString())
    .forEach(([currentLevel, pluginStatuses]) => {
      const statusReportingPlugins = pluginStatuses
        .filter(
          (pluginStatus) =>
            !updates[currentLevel as PluginStatus].find(
              (updatedStatus) => updatedStatus.pluginName === pluginStatus.pluginName
            )
        )
        .filter(({ isReportedStatus }) => isReportedStatus);

      const inferredCount = pluginStatuses.length - statusReportingPlugins.length;

      if (statusReportingPlugins.length === 1) {
        const reason = getReason(statusReportingPlugins[0]);
        if (inferredCount === 0) {
          messages.push(`${statusReportingPlugins[0].pluginName} is ${currentLevel}: ${reason}`);
        } else {
          messages.push(
            `'${statusReportingPlugins[0].pluginName}' plugin (and some others that depend on it) are ${currentLevel}: ${reason}`
          );
        }
      } else if (statusReportingPlugins.length > 1) {
        if (inferredCount === 0) {
          messages.push(
            `The following plugins are ${currentLevel}: ${statusReportingPlugins.map(
              ({ pluginName }) => pluginName
            )}`
          );
        } else {
          messages.push(
            `The following plugins (and some others that depend on them) are ${currentLevel}: ${statusReportingPlugins.map(
              ({ pluginName }) => pluginName
            )}`
          );
        }

        statusReportingPlugins.forEach(({ pluginName, ...pluginStatus }) =>
          messages.push(`${pluginName} is ${currentLevel}: ${getReason(pluginStatus)}`)
        );
      }
    });

  return messages;
};

const getReason = ({ summary, detail }: Partial<ServiceStatusWithName>): string =>
  `${summary}${detail ? ` (${detail})` : ''}`;
