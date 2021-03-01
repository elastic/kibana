/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { escape, memoize } from 'lodash';
import { getHighlightHtml } from '../utils';
import { KBN_FIELD_TYPES } from '../../kbn_field_types/types';
import { FieldFormat } from '../field_format';
import {
  TextContextTypeConvert,
  HtmlContextTypeConvert,
  IFieldFormatMetaParams,
  FIELD_FORMAT_IDS,
} from '../types';

const templateMatchRE = /{{([\s\S]+?)}}/g;
const allowedUrlSchemes = ['http://', 'https://'];

const URL_TYPES = [
  {
    kind: 'a',
    text: i18n.translate('data.fieldFormats.url.types.link', {
      defaultMessage: 'Link',
    }),
  },
  {
    kind: 'img',
    text: i18n.translate('data.fieldFormats.url.types.img', {
      defaultMessage: 'Image',
    }),
  },
  {
    kind: 'audio',
    text: i18n.translate('data.fieldFormats.url.types.audio', {
      defaultMessage: 'Audio',
    }),
  },
];
const DEFAULT_URL_TYPE = 'a';

export class UrlFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.URL;
  static title = i18n.translate('data.fieldFormats.url.title', {
    defaultMessage: 'Url',
  });
  static fieldType = [
    KBN_FIELD_TYPES.NUMBER,
    KBN_FIELD_TYPES.BOOLEAN,
    KBN_FIELD_TYPES.DATE,
    KBN_FIELD_TYPES.IP,
    KBN_FIELD_TYPES.STRING,
    KBN_FIELD_TYPES.MURMUR3,
    KBN_FIELD_TYPES.UNKNOWN,
    KBN_FIELD_TYPES.CONFLICT,
  ];
  static urlTypes = URL_TYPES;

  constructor(params: IFieldFormatMetaParams) {
    super(params);
    this.compileTemplate = memoize(this.compileTemplate);
  }

  getParamDefaults() {
    return {
      type: DEFAULT_URL_TYPE,
      urlTemplate: null,
      labelTemplate: null,
      width: null,
      height: null,
    };
  }

  private formatLabel(value: string, url?: string): string {
    const template = this.param('labelTemplate');
    if (url == null) url = this.formatUrl(value);
    if (!template) return url;

    return this.compileTemplate(template)({
      value,
      url,
    });
  }

  private formatUrl(value: string): string {
    const template = this.param('urlTemplate');
    if (!template) return value;

    return this.compileTemplate(template)({
      value: encodeURIComponent(value),
      rawValue: value,
    });
  }

  private compileTemplate(template: string): Function {
    // trim all the odd bits, the variable names
    const parts = template.split(templateMatchRE).map((part, i) => (i % 2 ? part.trim() : part));

    return function (locals: Record<string, any>): string {
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

  private generateImgHtml(url: string, imageLabel: string): string {
    const isValidWidth = !isNaN(parseInt(this.param('width'), 10));
    const isValidHeight = !isNaN(parseInt(this.param('height'), 10));
    const maxWidth = isValidWidth ? `${this.param('width')}px` : 'none';
    const maxHeight = isValidHeight ? `${this.param('height')}px` : 'none';

    return `<img src="${url}" alt="${imageLabel}" style="width:auto; height:auto; max-width:${maxWidth}; max-height:${maxHeight};">`;
  }

  textConvert: TextContextTypeConvert = (value) => this.formatLabel(value);

  htmlConvert: HtmlContextTypeConvert = (rawValue, options = {}) => {
    const { field, hit } = options;
    const { parsedUrl } = this._params;
    const { basePath, pathname, origin } = parsedUrl || {};

    const url = escape(this.formatUrl(rawValue));
    const label = escape(this.formatLabel(rawValue, url));

    switch (this.param('type')) {
      case 'audio':
        return `<audio controls preload="none" src="${url}">`;

      case 'img':
        // If the URL hasn't been formatted to become a meaningful label then the best we can do
        // is tell screen readers where the image comes from.
        const imageLabel =
          label === url ? `A dynamically-specified image located at ${url}` : label;

        return this.generateImgHtml(url, imageLabel);
      default:
        const allowed = allowedUrlSchemes.some((scheme) => url.indexOf(scheme) === 0);
        if (!allowed && !parsedUrl) {
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
        if (!allowed) {
          // Handles urls like: `#/discover`
          if (url[0] === '#') {
            prefix = `${origin}${pathname}`;
          }
          // Handle urls like: `/app/kibana` or `/xyz/app/kibana`
          else if (url.indexOf(basePath || '/') === 0) {
            prefix = `${origin}`;
          }
          // Handle urls like: `../app/kibana`
          else {
            const prefixEnd = url[0] === '/' ? '' : '/';

            prefix = `${origin}${basePath || ''}/app${prefixEnd}`;
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
  };
}
