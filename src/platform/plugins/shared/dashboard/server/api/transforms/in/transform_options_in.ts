/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '../../types';
import { DASHBOARD_API_OPTION_KEYS, DASHBOARD_SO_OPTION_KEYS } from '../constants';

export function transformOptionsIn(options: DashboardState['options']): string {
  const apiOptions = options ?? {};
  const savedObjectOptions: { [key: string]: unknown } = {};

  DASHBOARD_API_OPTION_KEYS.forEach((apiKey, index) => {
    const soKey = DASHBOARD_SO_OPTION_KEYS[index];
    if (apiOptions[apiKey] !== undefined) savedObjectOptions[soKey] = apiOptions[apiKey];
  });
  return JSON.stringify(savedObjectOptions);
}
