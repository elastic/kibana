/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreStart, NotificationsStart, IUiSettingsClient } from 'src/core/public';

import { DataPublicPluginStart } from '../../data/public';
import { createGetterSetter } from '../../kibana_utils/public';
import { MapsLegacyConfig } from '../../maps_legacy/config';

export const [getData, setData] = createGetterSetter<DataPublicPluginStart>('Data');

export const [getNotifications, setNotifications] = createGetterSetter<NotificationsStart>(
  'Notifications'
);

export const [getUISettings, setUISettings] = createGetterSetter<IUiSettingsClient>('UISettings');

export const [getInjectedMetadata, setInjectedMetadata] = createGetterSetter<
  CoreStart['injectedMetadata']
>('InjectedMetadata');

export const [getInjectedVars, setInjectedVars] = createGetterSetter<{
  enableExternalUrls: boolean;
  emsTileLayerId: unknown;
}>('InjectedVars');

export const [getMapsLegacyConfig, setMapsLegacyConfig] = createGetterSetter<MapsLegacyConfig>(
  'MapsLegacyConfig'
);

export const getEnableExternalUrls = () => getInjectedVars().enableExternalUrls;
