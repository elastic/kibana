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

import $ from 'jquery';
import { i18n } from '@kbn/i18n';
import { UrlObject } from './types';

/**
 * This class processes all Vega spec customizations,
 * converting url object parameters into query results.
 */
export class UrlParser {
  _onWarning: (...args: string[]) => void;
  constructor(onWarning: (...args: string[]) => void) {
    this._onWarning = onWarning;
  }

  // noinspection JSMethodCanBeStatic
  /**
   * Update request object
   */
  parseUrl(obj: UrlObject, urlObj: UrlObject) {
    let url = urlObj.url;
    if (!url) {
      throw new Error(
        i18n.translate('visTypeVega.urlParser.dataUrlRequiresUrlParameterInFormErrorMessage', {
          defaultMessage: '{dataUrlParam} requires a {urlParam} parameter in a form "{formLink}"',
          values: {
            dataUrlParam: '"data.url"',
            urlParam: '"url"',
            formLink: 'https://example.org/path/subpath',
          },
        })
      );
    }

    const query = urlObj.query;
    if (!query) {
      this._onWarning(
        i18n.translate('visTypeVega.urlParser.urlShouldHaveQuerySubObjectWarningMessage', {
          defaultMessage: 'Using a {urlObject} should have a {subObjectName} sub-object',
          values: {
            urlObject: '"url": {"%type%": "url", "url": ...}',
            subObjectName: '"query"',
          },
        })
      );
    } else {
      url += (url.includes('?') ? '&' : '?') + $.param(query);
    }

    obj.url = url;
  }

  /**
   * No-op - the url is already set during the parseUrl
   */
  populateData() {}
}
