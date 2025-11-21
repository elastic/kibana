/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '../../types';

const SO_OPTION_KEYS = [
  'hidePanelTitles',
  'useMargins',
  'syncColors',
  'syncCursor',
  'syncTooltips',
];
const API_OPTION_KEYS = [
  'hide_panel_titles',
  'use_margins',
  'sync_colors',
  'sync_cursor',
  'sync_tooltips',
];

export function transformOptionsOut(optionsJSON: string): Required<DashboardState>['options'] {
  const options = JSON.parse(optionsJSON);
  const knownOptions: { [key: string]: unknown } = {};
  Object.keys(options).forEach((soKey, index) => {
    const apiKey = API_OPTION_KEYS[index];
    if (SO_OPTION_KEYS.includes(soKey)) knownOptions[apiKey] = options[soKey];
  });
  return knownOptions;
}
