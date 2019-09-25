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
import { getHighlightHtml } from '../../../../../../plugins/data/common/field_formats';

const templateMatchRE = /{{([\s\S]+?)}}/g;
const whitelistUrlSchemes = ['http://', 'https://'];

const URL_TYPES = [
  { kind: 'a', text: 'Link' },
  { kind: 'img', text: 'Image' },
  { kind: 'audio', text: 'Audio' }
];
const DEFAULT_URL_TYPE = 'a';

export function createUrlFormat(FieldFormat) {
  class UrlFormat extends FieldFormat {
    constructor(params) {
      super(params);
      this._compileTemplate = _.memoize(this._compileTemplate);
    }

    getParamDefaults() {
      return {
        type: DEFAULT_URL_TYPE,
        urlTemplate: null,
        labelTemplate: null
      };
    }

    _formatLabel(value, url) {
      const template = this.param('labelTemplate');
      if (url == null) url = this._formatUrl(value);
      if (!template) return url;

      return this._compileTemplate(template)({
        value: value,
        url: url
      });
    }

    _formatUrl(value) {
      const template = this.param('urlTemplate');
      if (!template) return value;

      return this._compileTemplate(template)({
        value: encodeURIComponent(value),
        rawValue: value
      });
    }

    _compileTemplate(template) {
      const parts = template.split(templateMatchRE).map(function (part, i) {
        // trim all the odd bits, the variable names
        return (i % 2) ? part.trim() : part;
      });

      return function (locals) {
        // replace all the odd bits with their local var
        let output = '';
        let i = -1;
        while (++i < parts.length) {
          if (i % 2) {
            if (locals.hasOwnProperty(parts[i])) {
              const local = locals[parts[i]];
              output += local == null ? '' : local;
            }
          } else {
            output += parts[i];
          }
        }

        return output;
      };
    }

    static id = 'url';
    static title = 'Url';
    static fieldType = [
      'number',
      'boolean',
      'date',
      'ip',
      'string',
      'murmur3',
      'unknown',
      'conflict'
    ];
    static urlTypes = URL_TYPES;
  }

  UrlFormat.prototype._convert = {
    text: function (value) {
      return this._formatLabel(value);
    },

    html: function (rawValue, field, hit, parsedUrl) {
      const url = _.escape(this._formatUrl(rawValue));
      const label = _.escape(this._formatLabel(rawValue, url));

      switch (this.param('type')) {
        case 'audio':
          return `<audio controls preload="none" src="${url}">`;

        case 'img':
          // If the URL hasn't been formatted to become a meaningful label then the best we can do
          // is tell screen readers where the image comes from.
          const imageLabel =
            label === url
              ? `A dynamically-specified image located at ${url}`
              : label;

          return `<img src="${url}" alt="${imageLabel}">`;
        default:
          const inWhitelist = whitelistUrlSchemes.some(scheme => url.indexOf(scheme) === 0);
          if (!inWhitelist && !parsedUrl) {
            return url;
          }

          let prefix = '';
          /**
           * This code attempts to convert a relative url into a kibana absolute url
           *
           * SUPPORTED:
           *  - /app/kibana/
           *  - ../app/kibana
           *  - #/discover
           *
           * UNSUPPORTED
           *  - app/kibana
           */
          if (!inWhitelist) {
            // Handles urls like: `#/discover`
            if (url[0] === '#') {
              prefix = `${parsedUrl.origin}${parsedUrl.pathname}`;
            }
            // Handle urls like: `/app/kibana` or `/xyz/app/kibana`
            else if (url.indexOf(parsedUrl.basePath || '/') === 0) {
              prefix = `${parsedUrl.origin}`;
            }
            // Handle urls like: `../app/kibana`
            else {
              const prefixEnd = url[0] === '/' ? '' : '/';

              prefix = `${parsedUrl.origin}${parsedUrl.basePath || ''}/app${prefixEnd}`;
            }
          }

          let linkLabel;

          if (hit && hit.highlight && hit.highlight[field.name]) {
            linkLabel = getHighlightHtml(label, hit.highlight[field.name]);
          } else {
            linkLabel = label;
          }

          const linkTarget = this.param('openLinkInCurrentTab') ? '_self' : '_blank';

          return `<a href="${prefix}${url}" target="${linkTarget}" rel="noopener noreferrer">${linkLabel}</a>`;
      }
    }
  };

  return UrlFormat;
}
