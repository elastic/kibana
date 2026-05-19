/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Writable } from '@kbn/utility-types';
import type { Type, TypeOf } from '@kbn/config-schema';

import type { DashboardState, Warnings } from '../../types';
import type { getDashboardStateSchema } from '../../dashboard_state_schemas';

const savedObjectToAPIOptionsKeys = {
  hidePanelTitles: 'hide_panel_titles',
  hidePanelBorders: 'hide_panel_borders',
  useMargins: 'use_margins',
  syncColors: 'sync_colors',
  syncTooltips: 'sync_tooltips',
  syncCursor: 'sync_cursor',
  autoApplyFilters: 'auto_apply_filters',
} as const;
type ParsedSavedObjectOptions = { [key in keyof typeof savedObjectToAPIOptionsKeys]: boolean };

export function transformOptionsOut(
  optionsJSON: string,
  controlGroupShowApplyButtonSetting: boolean | undefined,
  schema: Type<TypeOf<ReturnType<typeof getDashboardStateSchema>>['options']>
): { options: Partial<DashboardState['options']>; warning: Warnings[number] | undefined } {
  let warning: Warnings[number] | undefined;

  const options = JSON.parse(optionsJSON) as ParsedSavedObjectOptions;
  const apiOptions: Writable<Partial<DashboardState['options']>> = {};
  Object.keys(options).forEach((key) => {
    const savedObjectKey = key as keyof ParsedSavedObjectOptions;
    const apiKey = savedObjectToAPIOptionsKeys[savedObjectKey];
    if (apiKey) apiOptions[apiKey] = options[savedObjectKey];
  });

  let transformedOptions = {
    ...apiOptions,
    ...(apiOptions.auto_apply_filters === undefined &&
      controlGroupShowApplyButtonSetting !== undefined && {
        auto_apply_filters: !controlGroupShowApplyButtonSetting,
      }),
  };

  try {
    transformedOptions = schema.validate(transformOptionsOut);
  } catch (e) {
    warning = {
      type: 'dropped_property',
      message: `Unable to validate dashboard options. Error:  ${e.messaged}`,
      key: 'options',
      value: transformedOptions,
    };
  }
  return { options: transformedOptions, warning };
}
