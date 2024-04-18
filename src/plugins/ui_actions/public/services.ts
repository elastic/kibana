/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AnalyticsServiceStart, I18nStart, ThemeServiceSetup } from '@kbn/core/public';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';

export const [getAnalytics, setAnalytics] = createGetterSetter<AnalyticsServiceStart>('Analytics');
export const [getI18n, setI18n] = createGetterSetter<I18nStart>('I18n');
export const [getTheme, setTheme] = createGetterSetter<ThemeServiceSetup>('Theme');
