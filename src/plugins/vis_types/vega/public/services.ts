/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { NotificationsStart, DocLinksStart, ThemeServiceStart } from '@kbn/core/public';

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';
import type { MapsEmsPluginPublicStart } from '@kbn/maps-ems-plugin/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';

export const [getData, setData] = createGetterSetter<DataPublicPluginStart>('Data');

export const [getDataViews, setDataViews] =
  createGetterSetter<DataViewsPublicPluginStart>('DataViews');

export const [getNotifications, setNotifications] =
  createGetterSetter<NotificationsStart>('Notifications');

export const [getMapsEms, setMapsEms] = createGetterSetter<MapsEmsPluginPublicStart>('mapsEms');

export const [getInjectedVars, setInjectedVars] = createGetterSetter<{
  enableExternalUrls: boolean;
}>('InjectedVars');

export const getEnableExternalUrls = () => getInjectedVars().enableExternalUrls;

export const [getDocLinks, setDocLinks] = createGetterSetter<DocLinksStart>('docLinks');

export const [getUsageCollectionStart, setUsageCollectionStart] =
  createGetterSetter<UsageCollectionStart>('UsageCollection');

export const [getThemeService, setThemeService] =
  createGetterSetter<ThemeServiceStart>('ThemeServiceStart');
