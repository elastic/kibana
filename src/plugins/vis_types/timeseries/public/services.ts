/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { I18nStart, IUiSettingsClient, CoreStart } from 'src/core/public';
import { createGetterSetter } from '../../../kibana_utils/public';
import { ChartsPluginStart } from '../../../charts/public';
import { DataPublicPluginStart } from '../../../data/public';
import { DataViewsPublicPluginStart } from '../../../data_views/public';

export const [getUISettings, setUISettings] = createGetterSetter<IUiSettingsClient>('UISettings');

export const [getFieldFormats, setFieldFormats] =
  createGetterSetter<DataPublicPluginStart['fieldFormats']>('FieldFormats');

export const [getCoreStart, setCoreStart] = createGetterSetter<CoreStart>('CoreStart');

export const [getDataStart, setDataStart] = createGetterSetter<DataPublicPluginStart>('DataStart');

export const [getDataViewsStart, setDataViewsStart] =
  createGetterSetter<DataViewsPublicPluginStart>('dataViews');

export const [getI18n, setI18n] = createGetterSetter<I18nStart>('I18n');

export const [getCharts, setCharts] = createGetterSetter<ChartsPluginStart>('ChartsPluginStart');
