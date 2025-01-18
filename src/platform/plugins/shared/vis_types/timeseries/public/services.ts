/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { I18nStart, IUiSettingsClient, CoreStart } from '@kbn/core/public';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';

export const [getUISettings, setUISettings] = createGetterSetter<IUiSettingsClient>('UISettings');

export const [getFieldFormats, setFieldFormats] =
  createGetterSetter<FieldFormatsStart>('FieldFormats');

export const [getCoreStart, setCoreStart] = createGetterSetter<CoreStart>('CoreStart');

export const [getDataStart, setDataStart] = createGetterSetter<DataPublicPluginStart>('DataStart');
export const [getUnifiedSearchStart, setUnifiedSearchStart] =
  createGetterSetter<UnifiedSearchPublicPluginStart>('unifiedSearchStart');

export const [getDataViewsStart, setDataViewsStart] =
  createGetterSetter<DataViewsPublicPluginStart>('dataViews');

export const [getI18n, setI18n] = createGetterSetter<I18nStart>('I18n');

export const [getCharts, setCharts] = createGetterSetter<ChartsPluginStart>('ChartsPluginStart');

export const [getUsageCollectionStart, setUsageCollectionStart] =
  createGetterSetter<UsageCollectionStart>('UsageCollection');
