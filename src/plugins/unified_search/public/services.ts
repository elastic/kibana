/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ThemeServiceStart,
  OverlayStart,
  AnalyticsServiceStart,
  I18nStart,
} from '@kbn/core/public';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';
import { DataViewsContract } from '@kbn/data-views-plugin/public';

export const [getIndexPatterns, setIndexPatterns] =
  createGetterSetter<DataViewsContract>('IndexPatterns');

export const [getAnalytics, setAnalytics] = createGetterSetter<AnalyticsServiceStart>('Analytics');

export const [getI18n, setI18n] = createGetterSetter<I18nStart>('I18n');

export const [getTheme, setTheme] = createGetterSetter<ThemeServiceStart>('Theme');

export const [getOverlays, setOverlays] = createGetterSetter<OverlayStart>('Overlays');
