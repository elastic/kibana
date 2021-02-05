/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from 'kibana/public';
import { NotificationsStart } from 'kibana/public';
import { createGetterSetter } from '../../kibana_utils/public';
import { DataPublicPluginStart } from '../../data/public';
import { KibanaLegacyStart } from '../../kibana_legacy/public';
import { SharePluginStart } from '../../share/public';
import { VectorLayer, TmsLayer } from '../../maps_legacy/public';

export const [getCoreService, setCoreService] = createGetterSetter<CoreStart>('Core');

export const [getFormatService, setFormatService] = createGetterSetter<
  DataPublicPluginStart['fieldFormats']
>('data.fieldFormats');

export const [getNotifications, setNotifications] = createGetterSetter<NotificationsStart>(
  'Notifications'
);

export const [getQueryService, setQueryService] = createGetterSetter<
  DataPublicPluginStart['query']
>('Query');

export const [getShareService, setShareService] = createGetterSetter<SharePluginStart>('Share');

export const [getKibanaLegacy, setKibanaLegacy] = createGetterSetter<KibanaLegacyStart>(
  'KibanaLegacy'
);

export const [getTmsLayers, setTmsLayers] = createGetterSetter<TmsLayer[]>('TmsLayers');

export const [getVectorLayers, setVectorLayers] = createGetterSetter<VectorLayer[]>('VectorLayers');
