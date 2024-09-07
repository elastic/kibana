/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
      const urlParams = new URLSearchParams();
      for (const [name, value] of Object.entries(query)) {
        urlParams.append(name, String(value));
      }
      url += (url.includes('?') ? '&' : '?') + urlParams.toString();
    }

    obj.url = url;
  }

  /**
   * No-op - the url is already set during the parseUrl
   */
  populateData() {}
}
