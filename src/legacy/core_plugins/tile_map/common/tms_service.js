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

import _ from 'lodash';
import { ORIGIN } from './origin';

export class TMSService {

  _getEmsJson = _.once(async url => {
    return this._emsClient.getManifest(this._emsClient.extendUrlWithParams(url));
  });

  constructor(config,  emsClient) {
    this._config = config;
    this._emsClient = emsClient;
  }

  _getRasterFormats(locale, formatType) {
    return this._config.formats.filter(format => {
      return format.locale === locale && format.format === formatType;
    });
  }

  _getDefaultStyleUrl() {
    let rasterFormats = this._getRasterFormats(this._emsClient.getLocale(), 'raster');
    if (!rasterFormats.length) {//fallback to default locale
      rasterFormats = this._getRasterFormats(this._emsClient.getDefaultLocale(), 'raster');
    }
    if (!rasterFormats.length) {
      throw new Error(`Cannot find raster tile layer for locale ${this._emsClient.getLocale()} or ${this._emsClient.getDefaultLocale()}`);
    }
    const defaultStyle = rasterFormats[0];
    if (defaultStyle && defaultStyle.hasOwnProperty('url')) {
      return defaultStyle.url;
    }
  }

  async _getVectorStyleFileUrl() {

    let vectorFormats = this._getRasterFormats(this._emsClient.getLocale(), 'vector');
    if (!vectorFormats.length) {//fallback to default locale
      vectorFormats = this._getRasterFormats(this._emsClient.getDefaultLocale(), 'vector');
    }
    if (!vectorFormats.length) {
      throw new Error(`Cannot find raster tile layer for locale ${this._emsClient.getLocale()} or ${this._emsClient.getDefaultLocale()}`);
    }
    const defaultStyle = vectorFormats[0];
    if (defaultStyle && defaultStyle.hasOwnProperty('url')) {
      return defaultStyle.url;
    }


  }

  async getVectorStyle() {
    const url = await this._getVectorStyleFileUrl();
    console.log('vsu', url);

    const extendedUrl = this._emsClient.extendUrlWithParams(url);
    console.log('eu', extendedUrl);
    // const json = await this._emsClient.getManifest(extendedUrl);
    const response = await fetch(extendedUrl);
    const json = await response.json();
    console.log('ejs', json);
    return json;

  }

  async getUrlTemplate() {
    const defaultStyle = this._getDefaultStyleUrl();
    //is this buggy (?)
    const tileJson = await this._getEmsJson(defaultStyle);
    return this._emsClient.extendUrlWithParams(tileJson.tiles[0]);
  }

  getDisplayName() {
    return this._emsClient.getValueInLanguage(this._config.name);
  }

  getAttributions() {
    return this._config.attribution.map(attribution => {
      const url = this._emsClient.getValueInLanguage(attribution.url);
      const label = this._emsClient.getValueInLanguage(attribution.label);
      return {
        url: url,
        label: label
      };
    });
  }

  getHTMLAttribution() {
    const attributions = this._config.attribution.map(attribution => {
      const url = this._emsClient.getValueInLanguage(attribution.url);
      const label = this._emsClient.getValueInLanguage(attribution.label);
      const html = url ? `<a rel="noreferrer noopener" href="${url}">${label}</a>` : label;
      return this._emsClient.sanitizeHtml(`${html}`);
    });
    return `<p>${attributions.join(' | ')}</p>`;//!!!this is the current convention used in Kibana
  }

  getMarkdownAttribution() {
    const attributions = this._config.attribution.map(attribution => {
      const url = this._emsClient.getValueInLanguage(attribution.url);
      const label = this._emsClient.getValueInLanguage(attribution.label);
      const markdown = `[${label}](${url})`;
      return markdown;
    });
    return attributions.join('|');
  }

  async getMinZoom() {
    const tileJson = await this._getEmsJson(this._getDefaultStyleUrl());
    return tileJson.minzoom;
  }

  async getMaxZoom() {
    const tileJson = await this._getEmsJson(this._getDefaultStyleUrl());
    return tileJson.maxzoom;
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
