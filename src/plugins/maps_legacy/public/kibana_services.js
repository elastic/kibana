/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
