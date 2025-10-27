/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RefreshInterval } from '@kbn/data-plugin/public';
import { pick } from 'lodash';

import type { Reference } from '@kbn/content-management-utils';
import type { DashboardState } from '../../server';

import { LATEST_VERSION } from '../../common/content_management';
import { dataService } from '../services/kibana_services';
import type { DashboardApi } from './types';

export const getSerializedState = ({
  controlGroupReferences,
  dashboardState,
  panelReferences,
}: {
  controlGroupReferences?: Reference[];
  dashboardState: DashboardState;
  panelReferences?: Reference[];
}): ReturnType<DashboardApi['getSerializedState']> => {
  const {
    query: {
      timefilter: { timefilter },
    },
  } = dataService;
  const {
    tags,
    query,
    title,
    filters,
    timeRestore,
    description,
    panels,
    options,
    controlGroupInput,
  } = dashboardState;

  /**
   * Parse global time filter settings
   */
  const timeRange = timeRestore ? pick(timefilter.getTime(), ['from', 'to']) : undefined;

  const refreshInterval = timeRestore
    ? (pick(timefilter.getRefreshInterval(), [
        'display',
        'pause',
        'section',
        'value',
      ]) as RefreshInterval)
    : undefined;

  const attributes: DashboardState = {
    version: LATEST_VERSION,
    controlGroupInput: controlGroupInput as DashboardState['controlGroupInput'],
    description: description ?? '',
    ...(filters ? { filters } : {}),
    ...(query ? { query } : {}),
    refreshInterval,
    timeRange,
    timeRestore,
    options,
    panels,
    title,
    tags,
  };

  const allReferences = [...(panelReferences ?? []), ...(controlGroupReferences ?? [])];
  return { attributes, references: allReferences };
};
