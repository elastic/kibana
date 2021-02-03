/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

let toast;
export const setToasts = (notificationToast) => (toast = notificationToast);
export const getToasts = () => toast;

let uiSettings;
export const setUiSettings = (coreUiSettings) => (uiSettings = coreUiSettings);
export const getUiSettings = () => uiSettings;

let kibanaVersion;
export const setKibanaVersion = (version) => (kibanaVersion = version);
export const getKibanaVersion = () => kibanaVersion;

let mapsLegacyConfig;
export const setMapsLegacyConfig = (config) => (mapsLegacyConfig = config);
export const getMapsLegacyConfig = () => mapsLegacyConfig;

export const getEmsTileLayerId = () => getMapsLegacyConfig().emsTileLayerId;
