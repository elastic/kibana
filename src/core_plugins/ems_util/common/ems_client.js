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

import MarkdownIt from 'markdown-it';
import _ from 'lodash';
import { modifyUrl } from '../../../core/public/utils';

const extendUrl = (url, props) => (
  modifyUrl(url, parsed => _.merge(parsed, props))
);

const markdownIt = new MarkdownIt({
  html: false,
  linkify: true
});


/**
 *  Unescape a url template that was escaped by encodeURI() so leaflet
 *  will be able to correctly locate the variables in the template
 *  @param  {String} url
 *  @return {String}
 */
const unescapeTemplateVars = url => {
  const ENCODED_TEMPLATE_VARS_RE = /%7B(\w+?)%7D/g;
  return url.replace(ENCODED_TEMPLATE_VARS_RE, (total, varName) => `{${varName}}`);
};




export class EMSClient {


  constructor({ kbnVersion, manifestServiceUrl, htmlSanitizer }) {
    this._queryParams = {
      my_app_version: kbnVersion
    };

    this._sanitizer = htmlSanitizer  ? htmlSanitizer : x => x;
    this._manifestServiceUrl = manifestServiceUrl;
    this._loadCatalogue = null;
    this._loadFileLayers = null;
    this._loadTMSServices = null;

  }

  /**
   * this internal method is overridden by the tests to simulate custom manifest.
   */
  async _getManifest(manifestUrl) {
    // return $http({
    //   url: extendUrl(manifestUrl, { query: this._queryParams }),
    //   method: 'GET'
    // });
  }


  /**
   * Add optional query-parameters to all requests
   *
   * @param additionalQueryParams
   */
  addQueryParams(additionalQueryParams) {
    for (const key in additionalQueryParams) {
      if (additionalQueryParams.hasOwnProperty(key)) {
        if (additionalQueryParams[key] !== this._queryParams[key]) {
          //changes detected.
          this._queryParams = _.assign({}, this._queryParams, additionalQueryParams);
          this._invalidateSettings();
          break;
        }
      }
    }
  }

  _invalidateSettings() {

    this._loadCatalogue = _.once(async () => {

      try {
        const response = await this._getManifest(this._manifestServiceUrl, this._queryParams);
        return response.data;
      } catch (e) {
        if (!e) {
          e = new Error('Unknown error');
        }
        if (!(e instanceof Error)) {
          e = new Error(e.data || `status ${e.statusText || e.status}`);
        }
        throw new Error(`Could not retrieve manifest from the tile service: ${e.message}`);
      }
    });


    this._loadFileLayers = _.once(async () => {
      const catalogue = await this._loadCatalogue();

      const fileService = catalogue.services.find(service => service.type === 'file');
      if (!fileService) {
        return [];
      }

      const manifest = await this._getManifest(fileService.manifest, this._queryParams);
      const layers = manifest.data.layers.filter(layer => layer.format === 'geojson' || layer.format === 'topojson');
      layers.forEach((layer) => {
        layer.url = this._extendUrlWithParams(layer.url);
        layer.attribution = this._sanitizer(markdownIt.render(layer.attribution));
      });
      return layers;
    });

    this._loadTMSServices = _.once(async () => {

      const catalogue = await this._loadCatalogue();
      const tmsService = catalogue.services.find((service) => service.type === 'tms');
      if (!tmsService) {
        return [];
      }
      const tmsManifest = await this._getManifest(tmsService.manifest, this._queryParams);
      const preppedTMSServices = tmsManifest.data.services.map((tmsService) => {
        const preppedService = _.cloneDeep(tmsService);
        preppedService.attribution = this._sanitizer(markdownIt.render(preppedService.attribution));
        preppedService.subdomains = preppedService.subdomains || [];
        preppedService.url = this._extendUrlWithParams(preppedService.url);
        return preppedService;
      });

      return preppedTMSServices;

    });

  }

  _extendUrlWithParams(url) {
    return unescapeTemplateVars(extendUrl(url, {
      query: this._queryParams
    }));
  }


  async getFileLayers() {
    return await this._loadFileLayers();
  }

  async getTMSServices() {

    const allServices = [];
    // if (tilemapsConfig.deprecated.isOverridden) {//use tilemap.* settings from yml
    //   const tmsService = _.cloneDeep(tmsOptionsFromConfig);
    //   tmsService.url = tilemapsConfig.deprecated.config.url;
    //   tmsService.id = 'TMS in config/kibana.yml';
    //   allServices.push(tmsService);
    // }

    const servicesFromManifest = await this._loadTMSServices();
    return allServices.concat(servicesFromManifest);
  }

  async getFileLayerForName() {

  }


}
