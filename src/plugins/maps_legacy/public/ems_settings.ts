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

import { MapsLegacyConfig } from '../config';

export class EMSSettings {
  private readonly _config: MapsLegacyConfig;

  constructor(config: MapsLegacyConfig) {
    this._config = config;
  }

  _isEMSUrlSet() {
    return this._config.emsUrl.length > 0;
  }

  _getEMSRoot() {
    return this._config.emsUrl.replace(/\/$/, '');
  }

  isConfigValid(): boolean {
    const badConfig =
      this._isEMSUrlSet() &&
      (!this._config.includeElasticMapsService || this._config.proxyElasticMapsServiceInMaps);
    return !badConfig;
  }

  getEMSFileApiUrl(): string {
    if (this._isEMSUrlSet()) {
      return `${this._getEMSRoot()}/file`;
    } else {
      return this._config.emsFileApiUrl;
    }
  }

  getEMSTileApiUrl(): string {
    if (this._isEMSUrlSet()) {
      return `${this._getEMSRoot()}/tile`;
    } else {
      return this._config.emsTileApiUrl;
    }
  }
  getEMSLandingPageUrl(): string {
    if (this._isEMSUrlSet()) {
      return `${this._getEMSRoot()}/maps`;
    } else {
      return this._config.emsLandingPageUrl;
    }
  }

  getEMSFontLibraryUrl(): string {
    if (this._isEMSUrlSet()) {
      return `${this._getEMSRoot()}/tile/fonts/{fontstack}/{range}.pbf`;
    } else {
      return this._config.emsFontLibraryUrl;
    }
  }
}
