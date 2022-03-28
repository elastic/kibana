/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, NotificationsStart, IUiSettingsClient, DocLinksStart } from 'src/core/public';

import { DataPublicPluginStart } from '../../../data/public';
import { DataViewsPublicPluginStart } from '../../../data_views/public';
import { createGetterSetter } from '../../../kibana_utils/public';
import type { MapsEmsPluginPublicStart } from '../../../maps_ems/public';

export const [getData, setData] = createGetterSetter<DataPublicPluginStart>('Data');

export const [getDataViews, setDataViews] =
  createGetterSetter<DataViewsPublicPluginStart>('DataViews');

export const [getNotifications, setNotifications] =
  createGetterSetter<NotificationsStart>('Notifications');

export const [getUISettings, setUISettings] = createGetterSetter<IUiSettingsClient>('UISettings');
export const [getMapsEms, setMapsEms] = createGetterSetter<MapsEmsPluginPublicStart>('mapsEms');

export const [getInjectedMetadata, setInjectedMetadata] =
  createGetterSetter<CoreStart['injectedMetadata']>('InjectedMetadata');

export const [getInjectedVars, setInjectedVars] = createGetterSetter<{
  enableExternalUrls: boolean;
  emsTileLayerId: unknown;
}>('InjectedVars');

export const getEnableExternalUrls = () => getInjectedVars().enableExternalUrls;

export const [getDocLinks, setDocLinks] = createGetterSetter<DocLinksStart>('docLinks');
