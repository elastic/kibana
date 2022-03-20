/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isDeepStrictEqual } from 'util';
import { Observable, asyncScheduler } from 'rxjs';
import {
  distinctUntilChanged,
  pairwise,
  takeUntil,
  map,
  filter,
  throttleTime,
} from 'rxjs/operators';
import { PluginName } from '../plugins';
import { ServiceStatus } from './types';

export type ServiceStatusWithName = ServiceStatus & {
  name: PluginName;
};

export interface ServiceLevelChange {
  previousLevel: string;
  nextLevel: string;
  impactedServices: string[];
}

export const getPluginsStatusChanges = (
  plugins$: Observable<Record<PluginName, ServiceStatus>>,
  stop$: Observable<void>,
  throttleDuration: number = 250
): Observable<ServiceLevelChange[]> => {
  return plugins$.pipe(
    takeUntil(stop$),
    distinctUntilChanged((previous, next) =>
      isDeepStrictEqual(getStatusLevelMap(previous), getStatusLevelMap(next))
    ),
    throttleTime(throttleDuration, asyncScheduler, { leading: true, trailing: true }),
    pairwise(),
    map(([oldStatus, newStatus]) => {
      return getPluginsStatusDiff(oldStatus, newStatus);
    }),
    filter((statusChanges) => statusChanges.length > 0)
  );
};

const getStatusLevelMap = (
  plugins: Record<PluginName, ServiceStatus>
): Record<PluginName, string> => {
  return Object.entries(plugins).reduce((levelMap, [key, value]) => {
    levelMap[key] = value.level.toString();
    return levelMap;
  }, {} as Record<PluginName, string>);
};

export const getPluginsStatusDiff = (
  previous: Record<PluginName, ServiceStatus>,
  next: Record<PluginName, ServiceStatus>
): ServiceLevelChange[] => {
  const statusChanges: Map<string, ServiceLevelChange> = new Map();

  Object.entries(next).forEach(([pluginName, nextStatus]) => {
    const previousStatus = previous[pluginName];
    if (!previousStatus) {
      return;
    }
    const previousLevel = statusLevel(previousStatus);
    const nextLevel = statusLevel(nextStatus);
    if (previousLevel === nextLevel) {
      return;
    }
    const changeKey = statusChangeKey(previousLevel, nextLevel);
    let statusChange = statusChanges.get(changeKey);
    if (!statusChange) {
      statusChange = {
        previousLevel,
        nextLevel,
        impactedServices: [],
      };
      statusChanges.set(changeKey, statusChange);
    }
    statusChange.impactedServices.push(pluginName);
  });

  return [...statusChanges.values()];
};

export const getServiceLevelChangeMessage = ({
  impactedServices: services,
  nextLevel: next,
  previousLevel: previous,
}: ServiceLevelChange): string => {
  return `${
    services.length
  } plugins changed status from '${previous}' to '${next}': ${services.join(', ')}`;
};

const statusLevel = (status: ServiceStatus) => status.level.toString();

const statusChangeKey = (previous: string, next: string) => `${previous}:${next}`;
