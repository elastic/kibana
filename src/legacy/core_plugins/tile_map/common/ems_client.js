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
import { TMSService } from './tms_service';
import { FileLayer } from './file_layer';
import fetch from 'node-fetch';
import { format as formatUrl, parse as parseUrl } from 'url';

const extendUrl = (url, props) => (
  modifyUrlLocal(url, parsed => _.merge(parsed, props))
);

const markdownIt = new MarkdownIt({
  html: false,
  linkify: true
});

/**
 * plugins cannot have upstream dependencies on core/*-kibana.
 * Work-around by copy-pasting modifyUrl routine here.
 * @param url
 * @param block
 */
function modifyUrlLocal(url, block) {

  const parsed = parseUrl(url, true);

  // copy over the most specific version of each
  // property. By default, the parsed url includes
  // several conflicting properties (like path and
  // pathname + search, or search and query) and keeping
  // track of which property is actually used when they
  // are formatted is harder than necessary
  const meaningfulParts = {
    protocol: parsed.protocol,
    slashes: parsed.slashes,
    auth: parsed.auth,
    hostname: parsed.hostname,
    port: parsed.port,
    pathname: parsed.pathname,
    query: parsed.query || {},
    hash: parsed.hash,
  };

  // the block modifies the meaningfulParts object, or returns a new one
  const modifiedParts = block(meaningfulParts) || meaningfulParts;

  // format the modified/replaced meaningfulParts back into a url
  return formatUrl({
    protocol: modifiedParts.protocol,
    slashes: modifiedParts.slashes,
    auth: modifiedParts.auth,
    hostname: modifiedParts.hostname,
    port: modifiedParts.port,
    pathname: modifiedParts.pathname,
    query: modifiedParts.query,
    hash: modifiedParts.hash,
  });

}

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


//this is not the default locale from Kibana, but the default locale supported by the Elastic Maps Service
const DEFAULT_LANGUAGE = 'en';

export class EMSClient {

  EMS_LOAD_TIMEOUT = 32000;

  constructor({ kbnVersion, manifestServiceUrl, htmlSanitizer, language, landingPageUrl }) {

    this._queryParams = {
      elastic_tile_service_tos: 'agree',
      my_app_name: 'kibana',
      my_app_version: kbnVersion,
    };

    this._sanitizer = htmlSanitizer ? htmlSanitizer : x => x;
    this._manifestServiceUrl = manifestServiceUrl;
    this._loadFileLayers = null;
    this._loadTMSServices = null;
    this._emsLandingPageUrl = typeof landingPageUrl === 'string' ? landingPageUrl : '';
    this._language = typeof language === 'string' ? language : DEFAULT_LANGUAGE;

    this._invalidateSettings();

  }

  getLocale() {
    return this._language;
  }

  getValueInLanguage(i18nObject) {
    if (!i18nObject) {
      return '';
    }
    return i18nObject[this._language] ? i18nObject[this._language]  : i18nObject[DEFAULT_LANGUAGE];
  }

  /**
   * this internal method is overridden by the tests to simulate custom manifest.
   */
  async getManifest(manifestUrl) {
    let result;
    try {
      const url = extendUrl(manifestUrl, { query: this._queryParams });
      result = await this._fetchWithTimeout(url);
    } catch (e) {
      if (!e) {
        e = new Error('Unknown error');
      }
      if (!(e instanceof Error)) {
        e = new Error(e.data || `status ${e.statusText || e.status}`);
      }
      throw new Error(`Unable to retrieve manifest from ${manifestUrl}: ${e.message}`);
    } finally {
      return result ? await result.json() : null;
    }
  }

  _fetchWithTimeout(url) {
    return new Promise(
      (resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`Request to ${url} timed out`)),
          this.EMS_LOAD_TIMEOUT
        );
        fetch(url)
          .then(
            response => {
              clearTimeout(timer);
              resolve(response);
            },
            err => {
              clearTimeout(timer);
              reject(err);
            }
          );
      });
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

    this._getManifestWithParams = _.once(
      async url => this.getManifest(this.extendUrlWithParams(url)));

    this._getCatalogueService = async serviceType => {
      const catalogueManifest = await this._getManifestWithParams(this._manifestServiceUrl);
      let service;
      if(_.has(catalogueManifest, 'services')) {
        service = catalogueManifest.services
          .find(s => s.type === serviceType);
      }
      return service || {};
    };

    this._wrapServiceAttribute = async (manifestUrl, attr, WrapperClass) => {
      const manifest = await this.getManifest(manifestUrl);
      if (_.has(manifest, attr)) {
        return manifest[attr].map(config => {
          return new WrapperClass(config, this);
        });
      }
      return [];
    };

    this._loadFileLayers = _.once(async () => {
      const fileService = await this._getCatalogueService('file');
      return _.isEmpty(fileService)
        ? []
        : this._wrapServiceAttribute(fileService.manifest, 'layers', FileLayer);
    });

    this._loadTMSServices = _.once(async () => {
      const tmsService = await this._getCatalogueService('tms');
      return _.isEmpty(tmsService)
        ? []
        : await this._wrapServiceAttribute(tmsService.manifest, 'services', TMSService);
    });
  }

  getLandingPageUrl() {
    return this._emsLandingPageUrl;
  }

  sanitizeMarkdown(markdown) {
    return this._sanitizer(markdownIt.render(markdown));
  }

  sanitizeHtml(html) {
    return this._sanitizer(html);
  }

  extendUrlWithParams(url) {
    return unescapeTemplateVars(extendUrl(url, {
      query: this._queryParams
    }));
  }

  async getFileLayers() {
    return await this._loadFileLayers();
  }

  async getTMSServices() {
    return await this._loadTMSServices();
  }

  async findFileLayerById(id) {
    const fileLayers = await this.getFileLayers();
    for (let i = 0; i < fileLayers.length; i++) {
      if (fileLayers[i].hasId(id)) {
        return fileLayers[i];
      }
    }
  }

  async findTMSServiceById(id) {
    const tmsServices = await this.getTMSServices();
    for (let i = 0; i < tmsServices.length; i++) {
      if (tmsServices[i].hasId(id)) {
        return tmsServices[i];
      }
    }
  }


}
