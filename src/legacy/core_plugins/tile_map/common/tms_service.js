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

import { ORIGIN } from './origin';

export class TMSService {

  constructor(config,  emsClient) {
    this._config = config;
    this._emsClient = emsClient;
  }

  getUrlTemplate() {
    return this._emsClient.extendUrlWithParams(this._config.url);
  }

  getHTMLAttribution() {
    return this._emsClient.sanitizeMarkdown(this._config.attribution);
  }

  getMarkdownAttribution() {
    return this._config.attribution;
  }

  getMinZoom() {
    return this._config.minZoom;
  }

  getMaxZoom() {
    return this._config.maxZoom;
  }

  getId() {
    return this._config.id;
  }

  hasId(id) {
    return this._config.id === id;
  }

  getOrigin() {
    return ORIGIN.EMS;
  }

}
