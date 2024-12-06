/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AnalyticsServiceStart, CoreStart, ThemeServiceStart } from '@kbn/core/public';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/common';

export const [getAnalytics, setAnalytics] =
  createGetterSetter<AnalyticsServiceStart>('AnalyticsService');
export const [getTheme, setTheme] = createGetterSetter<ThemeServiceStart>('ThemeService');
export const [getCoreStart, setCoreStart] = createGetterSetter<CoreStart>('CoreStart');
