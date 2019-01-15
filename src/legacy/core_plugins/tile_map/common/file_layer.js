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

export class FileLayer {

  constructor(config, emsClient) {
    this._config = config;
    this._emsClient = emsClient;
  }

  getAttributions() {
    const attributions = this._config.attribution.map(attribution => {
      const url = this._emsClient.getValueInLanguage(attribution.url);
      const label = this._emsClient.getValueInLanguage(attribution.label);
      return {
        url: url,
        label: label
      };
    });
    return attributions;
  }

  getHTMLAttribution() {
    const attributions = this._config.attribution.map(attribution => {
      const url = this._emsClient.getValueInLanguage(attribution.url);
      const label = this._emsClient.getValueInLanguage(attribution.label);
      const html = url ? `<a href=${url}>${label}</a>` : label;
      return this._emsClient.sanitizeHtml(html);
    });
    return attributions.join(' | ');//!!!this is the current convention used in Kibana
  }

  getFieldsInLanguage() {
    return this._config.fields.map(field => {
      return {
        type: field.type,
        name: field.id,
        description: this._emsClient.getValueInLanguage(field.label)
      };
    });
  }

  getDisplayName() {
    const layerName = this._emsClient.getValueInLanguage(this._config.layer_name);
    return (layerName)  ? layerName  : '';
  }

  getId() {
    return this._config.layer_id;
  }

  hasId(id) {
    const matchesLegacyId = this._config.legacy_ids.indexOf(id) >= 0;
    return this._config.layer_id === id || matchesLegacyId;
  }

  _getDefaultFormat() {
    const defaultFormat = this._config.formats.find(format => {
      return format.legacy_default;
    });
    if (defaultFormat) {
      return defaultFormat;
    }
    return this._config.formats[0];
  }

  getEMSHotLink() {
    const id = `file/${this.getId()}`;
    return `${this._emsClient.getLandingPageUrl()}#${id}`;
  }

  getDefaultFormatType() {
    const format = this._getDefaultFormat();
    return format.type;
  }

  getDefaultFormatMeta() {
    const format = this._getDefaultFormat();
    return format.meta;
  }

  getDefaultFormatUrl() {
    const format = this._getDefaultFormat();
    return this._emsClient.extendUrlWithParams(format.url);
  }

  getCreatedAt() {
    return this._config.created_at;
  }

  getOrigin() {
    return ORIGIN.EMS;
  }

}
