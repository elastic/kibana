/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NotificationsStart, CoreStart, ThemeServiceStart } from '@kbn/core/public';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';
import { DataViewsContract } from '@kbn/data-views-plugin/common';
import { DataPublicPluginStart } from './types';

export const [getNotifications, setNotifications] =
  createGetterSetter<NotificationsStart>('Notifications');

export const [getUiSettings, setUiSettings] =
  createGetterSetter<CoreStart['uiSettings']>('UiSettings');

export const [getOverlays, setOverlays] = createGetterSetter<CoreStart['overlays']>('Overlays');

export const [getIndexPatterns, setIndexPatterns] =
  createGetterSetter<DataViewsContract>('IndexPatterns');

export const [getSearchService, setSearchService] =
  createGetterSetter<DataPublicPluginStart['search']>('Search');

export const [getTheme, setTheme] = createGetterSetter<ThemeServiceStart>('Theme');
