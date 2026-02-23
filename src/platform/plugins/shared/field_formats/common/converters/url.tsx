/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { memoize } from 'lodash';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { getHighlightReact } from '../utils';
import { FieldFormat } from '../field_format';
import type {
  TextContextTypeConvert,
  HtmlContextTypeConvert,
  ReactContextTypeConvert,
  FieldFormatMetaParams,
  FieldFormatParams,
} from '../types';
import { FIELD_FORMAT_IDS } from '../types';
import { checkForMissingValueReact } from '../components';

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

  private formatLabel(value: string, url?: string): string {
    const template = this.param('labelTemplate');
    if (url == null) url = this.formatUrl(value);
    if (!template) return url;

    return this.compileTemplate(template)({
      value,
      url,
      rawValue: value,
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

    return function (locals: Record<string, string>): string {
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

  private getImgStyle(): React.CSSProperties {
    const parsedWidth = parseInt(this.param('width'), 10);
    const parsedHeight = parseInt(this.param('height'), 10);
    const isValidWidth = !isNaN(parsedWidth);
    const isValidHeight = !isNaN(parsedHeight);

    return {
      width: 'auto',
      height: 'auto',
      maxWidth: isValidWidth ? `${parsedWidth}px` : 'none',
      maxHeight: isValidHeight ? `${parsedHeight}px` : 'none',
    };
  }

  /**
   * Calculate the URL prefix for relative URLs based on parsedUrl context.
   */
  private getUrlPrefix(url: string): string {
    const { parsedUrl } = this._params;
    const { basePath, pathname, origin } = parsedUrl || {};

    const allowed = allowedUrlSchemes.some((scheme) => url.indexOf(scheme) === 0);
    if (allowed) {
      return '';
    }

    if (!parsedUrl) {
      return '';
    }

    // Handles urls like: `#/discover`
    if (url[0] === '#') {
      return `${origin}${pathname}`;
    }
    // Handle urls like: `/app/kibana` or `/xyz/app/kibana`
    else if (url.indexOf(basePath || '/') === 0) {
      return `${origin}`;
    }
    // Handle urls like: `../app/kibana`
    else {
      const prefixEnd = url[0] === '/' ? '' : '/';
      return `${origin}${basePath || ''}/app${prefixEnd}`;
    }
  }

  textConvert: TextContextTypeConvert = (value: unknown) => {
    const missing = this.checkForMissingValueText(value);
    if (missing) {
      return missing;
    }

    const stringValue = String(value);
    return this.formatLabel(stringValue);
  };

  htmlConvert: HtmlContextTypeConvert = () => {
    throw new Error(
      'UrlFormat does not support HTML rendering. Use reactConvert() or the FormattedValue component instead.'
    );
  };

  reactConvert: ReactContextTypeConvert = (rawValue: unknown, options = {}) => {
    const missing = checkForMissingValueReact(rawValue);
    if (missing) {
      return missing;
    }

    const { field, hit } = options;
    const { parsedUrl } = this._params;

    const stringValue = String(rawValue);
    const url = this.formatUrl(stringValue);
    const label = this.formatLabel(stringValue, url);

    switch (this.param('type')) {
      case 'audio':
        // Audio URLs are user-specified and we cannot provide captions for arbitrary external content
        // eslint-disable-next-line jsx-a11y/media-has-caption
        return <audio controls preload="none" src={url} />;

      case 'img': {
        // If the URL hasn't been formatted to become a meaningful label then the best we can do
        // is tell screen readers where the image comes from.
        const imageLabel =
          label === url ? `A dynamically-specified image located at ${url}` : label;

        return <img src={url} alt={imageLabel} style={this.getImgStyle()} />;
      }
      default: {
        const allowed = allowedUrlSchemes.some((scheme) => url.indexOf(scheme) === 0);
        if (!allowed && !parsedUrl) {
          return <>{url}</>;
        }

        const prefix = this.getUrlPrefix(url);

        // Handle highlighting in React
        let linkLabel: ReactNode;
        if (hit?.highlight?.[field?.name!]) {
          linkLabel = getHighlightReact(label, hit.highlight[field!.name]);
        } else {
          linkLabel = label;
        }

        const linkTarget = this.param('openLinkInCurrentTab') ? '_self' : '_blank';

        return (
          <a href={`${prefix}${url}`} target={linkTarget} rel="noopener noreferrer">
            {linkLabel}
          </a>
        );
      }
    }
  };
}
