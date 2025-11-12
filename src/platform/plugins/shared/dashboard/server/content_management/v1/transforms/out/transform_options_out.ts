/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '../../types';

const OPTION_KEYS = ['hidePanelTitles', 'useMargins', 'syncColors', 'syncCursor', 'syncTooltips'];

export function transformOptionsOut(
  optionsJSON: string,
  controlGroupShowApplyButtonSetting?: boolean
): Required<DashboardState>['options'] {
  const options = JSON.parse(optionsJSON);
  const knownOptions: { [key: string]: unknown } = {};
  Object.keys(options).forEach((key) => {
    if (OPTION_KEYS.includes(key)) knownOptions[key] = options[key];
  });
  return {
    ...knownOptions,
    ...(controlGroupShowApplyButtonSetting !== undefined && {
      autoApplyFilters: !controlGroupShowApplyButtonSetting,
    }),
  };
}
