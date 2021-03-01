/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient, ToastsSetup } from 'kibana/public';
import { MapsEmsConfig } from '../../maps_ems/config';

let toast: ToastsSetup;
export const setToasts = (notificationToast: ToastsSetup) => (toast = notificationToast);
export const getToasts = () => toast;

let uiSettings: IUiSettingsClient;
export const setUiSettings = (coreUiSettings: IUiSettingsClient) => (uiSettings = coreUiSettings);
export const getUiSettings = () => uiSettings;

let mapsEmsConfig: MapsEmsConfig;
export const setMapsEmsConfig = (config: MapsEmsConfig) => (mapsEmsConfig = config);

export const getEmsTileLayerId = () => mapsEmsConfig.emsTileLayerId;
