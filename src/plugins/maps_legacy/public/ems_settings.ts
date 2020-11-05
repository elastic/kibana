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

import {
  DEFAULT_EMS_FILE_API_URL,
  DEFAULT_EMS_FONT_LIBRARY_URL,
  DEFAULT_EMS_LANDING_PAGE_URL,
  DEFAULT_EMS_TILE_API_URL,
} from '../common/ems_defaults';

export interface IEMSConfig {
  emsUrl?: string;
  includeElasticMapsService?: boolean;
  proxyElasticMapsServiceInMaps?: boolean;
  emsFileApiUrl?: string;
  emsTileApiUrl?: string;
  emsLandingPageUrl?: string;
  emsFontLibraryUrl?: string;
}

export class EMSSettings {
  private readonly _config: IEMSConfig;

  constructor(config: IEMSConfig) {
    this._config = config;
  }

  _isEMSUrlSet() {
    return this._config.emsUrl && this._config.emsUrl.length > 0;
  }

  _getEMSRoot() {
    return this._config.emsUrl!.replace(/\/$/, '');
  }

  isOnPrem(): boolean {
    return !!this._isEMSUrlSet();
  }

  isConfigValid(): boolean {
    const badConfig =
      this._isEMSUrlSet() &&
      (!this._config.includeElasticMapsService || this._config.proxyElasticMapsServiceInMaps);
    return !badConfig;
  }

  getEMSFileApiUrl(): string {
    if (this._config.emsFileApiUrl !== DEFAULT_EMS_FILE_API_URL || !this._isEMSUrlSet()) {
      return this._config.emsFileApiUrl!;
    } else {
      return `${this._getEMSRoot()}/file`;
    }
  }

  getEMSTileApiUrl(): string {
    if (this._config.emsTileApiUrl !== DEFAULT_EMS_TILE_API_URL || !this._isEMSUrlSet()) {
      return this._config.emsTileApiUrl!;
    } else {
      return `${this._getEMSRoot()}/tile`;
    }
  }
  getEMSLandingPageUrl(): string {
    if (this._config.emsLandingPageUrl !== DEFAULT_EMS_LANDING_PAGE_URL || !this._isEMSUrlSet()) {
      return this._config.emsLandingPageUrl!;
    } else {
      return `${this._getEMSRoot()}/maps`;
    }
  }

  getEMSFontLibraryUrl(): string {
    if (this._config.emsFontLibraryUrl !== DEFAULT_EMS_FONT_LIBRARY_URL || !this._isEMSUrlSet()) {
      return this._config.emsFontLibraryUrl!;
    } else {
      return `${this._getEMSRoot()}/tile/fonts/{fontstack}/{range}.pbf`;
    }
  }
}
