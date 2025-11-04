/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Writable } from '@kbn/utility-types';
import type { DashboardOptions } from '../../../../server/content_management';

export function extractOptions(state: { [key: string]: unknown }): Partial<DashboardOptions> {
  if (typeof state.options === 'object') {
    return state.options as Partial<DashboardOptions>;
  }

  // <9.3 Options state spread directly into DashboardState
  const options: Partial<Writable<DashboardOptions>> = {};

  if (typeof state.hidePanelTitles === 'boolean') {
    options.hidePanelTitles = state.hidePanelTitles;
  }

  if (typeof state.useMargins === 'boolean') {
    options.useMargins = state.useMargins;
  }

  if (typeof state.syncColors === 'boolean') {
    options.syncColors = state.syncColors;
  }

  if (typeof state.syncTooltips === 'boolean') {
    options.syncTooltips = state.syncTooltips;
  }

  if (typeof state.syncCursor === 'boolean') {
    options.syncCursor = state.syncCursor;
  }

  return options;
}
