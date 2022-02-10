/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ServiceStatusLevel } from '../../../../types/status';
import { FormattedStatus, StatusState, STATUS_LEVEL_UI_ATTRS } from './load_status';

export const orderedLevels: ServiceStatusLevel[] = [
  'critical',
  'unavailable',
  'degraded',
  'available',
];

export const groupByLevel = (statuses: FormattedStatus[]) => {
  return statuses.reduce((map, status) => {
    const existing = map.get(status.state.id) ?? [];
    map.set(status.state.id, [...existing, status]);
    return map;
  }, new Map<ServiceStatusLevel, FormattedStatus[]>());
};

export const getHighestStatus = (statuses: FormattedStatus[]): Omit<StatusState, 'message'> => {
  const grouped = groupByLevel(statuses);
  for (const level of orderedLevels) {
    if (grouped.has(level) && grouped.get(level)!.length) {
      const { message, ...status } = grouped.get(level)![0].state;
      return status;
    }
  }
  return {
    id: 'available',
    title: STATUS_LEVEL_UI_ATTRS.available.title,
    uiColor: STATUS_LEVEL_UI_ATTRS.available.uiColor,
  };
};

export const getLevelSortValue = (status: FormattedStatus) => {
  return orderedLevels.indexOf(status.state.id);
};
