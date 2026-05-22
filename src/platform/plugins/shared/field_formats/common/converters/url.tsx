/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { memoize } from 'lodash';
import React from 'react';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { getHighlightReact } from '../utils';
import { FieldFormat } from '../field_format';
import type {
  ReactContextTypeSingleConvert,
  TextContextTypeConvert,
  FieldFormatMetaParams,
  FieldFormatParams,
} from '../types';
import { FIELD_FORMAT_IDS } from '../types';

const templateMatchRE = /{{([\s\S]+?)}}/g;
const allowedUrlSchemes = ['http://', 'https://', 'mailto:'];

const URL_TYPES = [
  {
    kind: 'a',
    text: i18n.translate('fieldFormats.url.types.link', {
      defaultMessage: 'Link',
    }),
  },
  {
    kind: 'img',
    text: i18n.translate('fieldFormats.url.types.img', {
      defaultMessage: 'Image',
    }),
  },
  {
    kind: 'audio',
    text: i18n.translate('fieldFormats.url.types.audio', {
      defaultMessage: 'Audio',
    }),
  },
];
const DEFAULT_URL_TYPE = 'a';

/** @public */
export class UrlFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.URL;
  static title = i18n.translate('fieldFormats.url.title', {
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

  constructor(params: FieldFormatParams & FieldFormatMetaParams) {
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

  private formatLabel(value: string | number, url?: string): string {
    const strValue = String(value);
    const template = this.param('labelTemplate');
    if (url == null) url = this.formatUrl(strValue);
    if (!template) return url;

    return this.compileTemplate(template)({
      value: strValue,
      url,
      rawValue: value,
    });
  }

  private formatUrl(value: string | number): string {
    const strValue = String(value);
    const template = this.param('urlTemplate');
    if (!template) return strValue;

    return this.compileTemplate(template)({
      value: encodeURIComponent(strValue),
      rawValue: value,
    });
  }

  private compileTemplate(template: string): Function {
    // trim all the odd bits, the variable names
    const parts = template.split(templateMatchRE).map((part, i) => (i % 2 ? part.trim() : part));

    return function (locals: Record<string, string | number>): string {
      // replace all the odd bits with their local var
      let output = '';
      let i = -1;
      while (++i < parts.length) {
        if (i % 2) {
          if (Object.hasOwn(locals, parts[i])) {
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

  textConvert: TextContextTypeConvert = (value: string | number) => {
    const missing = this.checkForMissingValueText(value);
    if (missing) {
      return missing;
    }

    return this.formatLabel(value);
  };

  reactConvertSingle: ReactContextTypeSingleConvert = (rawValue, options = {}) => {
    const missing = this.checkForMissingValueReact(rawValue);
    if (missing) return missing;

    // After the missing value check, rawValue is guaranteed to be a valid string or number
    const value = rawValue as string | number;

    const { field, hit } = options;
    const { parsedUrl } = this._params;
    const { basePath, pathname, origin } = parsedUrl || {};

    const url = this.formatUrl(value);
    const label = this.formatLabel(value, url);

    switch (this.param('type')) {
      case 'audio':
        // eslint-disable-next-line jsx-a11y/media-has-caption
        return <audio controls preload="none" src={url} />;

      case 'img': {
        // If the URL hasn't been formatted to become a meaningful label then the best we can do
        // is tell screen readers where the image comes from.
        const imageLabel =
          label === url
            ? i18n.translate('fieldFormats.url.dynamicImageAltText', {
                defaultMessage: 'A dynamically-specified image located at {url}',
                values: { url },
              })
            : label;
        const parsedWidth = parseInt(this.param('width'), 10);
        const parsedHeight = parseInt(this.param('height'), 10);
        return (
          <img
            src={url}
            alt={imageLabel}
            style={{
              width: 'auto',
              height: 'auto',
              maxWidth: !isNaN(parsedWidth) ? `${parsedWidth}px` : 'none',
              maxHeight: !isNaN(parsedHeight) ? `${parsedHeight}px` : 'none',
            }}
          />
        );
      }

      default: {
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

        const linkTarget = this.param('openLinkInCurrentTab') ? '_self' : '_blank';
        const fieldName = field?.name;
        const linkContent =
          fieldName && hit?.highlight?.[fieldName]
            ? getHighlightReact(label, hit.highlight[fieldName])
            : label;

        return (
          <a href={`${prefix}${url}`} target={linkTarget} rel="noopener noreferrer">
            {linkContent}
          </a>
        );
      }
    }
  };
}
