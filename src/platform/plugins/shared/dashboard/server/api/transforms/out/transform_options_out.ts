/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Writable } from '@kbn/utility-types';
import type { DashboardState } from '../../types';

const savedObjectToAPIOptionsKeys = {
  hidePanelTitles: 'hide_panel_titles',
  useMargins: 'use_margins',
  syncColors: 'sync_colors',
  syncTooltips: 'sync_tooltips',
  syncCursor: 'sync_cursor',
  autoApplyFilters: 'auto_apply_filters',
} as const;
type ParsedSavedObjectOptions = { [key in keyof typeof savedObjectToAPIOptionsKeys]: boolean };

export function transformOptionsOut(
  optionsJSON: string,
  controlGroupShowApplyButtonSetting?: boolean
): Required<DashboardState>['options'] {
  const options = JSON.parse(optionsJSON) as ParsedSavedObjectOptions;
  const apiOptions: Writable<Required<DashboardState>['options']> = {};
  Object.keys(options).forEach((key) => {
    const savedObjectKey = key as keyof ParsedSavedObjectOptions;
    const apiKey = savedObjectToAPIOptionsKeys[savedObjectKey];
    if (apiKey) apiOptions[apiKey] = options[savedObjectKey];
  });

  return {
    ...apiOptions,
    ...(apiOptions.auto_apply_filters === undefined &&
      controlGroupShowApplyButtonSetting !== undefined && {
        auto_apply_filters: !controlGroupShowApplyButtonSetting,
      }),
  };
}
