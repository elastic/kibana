/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DashboardSettings } from '../../../../common';

export function extractSettings(state: { [key: string]: unknown }): Partial<DashboardSettings> {
  const settings: Partial<DashboardSettings> = {};

  if (typeof state.hidePanelTitles === 'boolean') {
    settings.hidePanelTitles = state.hidePanelTitles;
  }

  if (typeof state.useMargins === 'boolean') {
    settings.useMargins = state.useMargins;
  }

  if (typeof state.syncColors === 'boolean') {
    settings.syncColors = state.syncColors;
  }

  if (typeof state.syncTooltips === 'boolean') {
    settings.syncTooltips = state.syncTooltips;
  }

  if (typeof state.syncCursor === 'boolean') {
    settings.syncCursor = state.syncCursor;
  }

  if (typeof state.description === 'string') {
    settings.description = state.description;
  }

  if (Array.isArray(state.tags)) {
    settings.tags = state.tags;
  }

  if (typeof state.timeRestore === 'boolean') {
    settings.timeRestore = state.timeRestore;
  }

  if (typeof state.title === 'string') {
    settings.title = state.title;
  }

  return settings;
}
