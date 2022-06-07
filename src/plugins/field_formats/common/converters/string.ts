/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { escape } from 'lodash';
import { i18n } from '@kbn/i18n';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { asPrettyString, getHighlightHtml, shortenDottedString } from '../utils';
import { FieldFormat } from '../field_format';
import { TextContextTypeConvert, FIELD_FORMAT_IDS, HtmlContextTypeConvert } from '../types';

const emptyLabel = i18n.translate('fieldFormats.string.emptyLabel', {
  defaultMessage: '(empty)',
});

const TRANSFORM_OPTIONS = [
  {
    kind: false,
    text: i18n.translate('fieldFormats.string.transformOptions.none', {
      defaultMessage: '- None -',
    }),
  },
  {
    kind: 'lower',
    text: i18n.translate('fieldFormats.string.transformOptions.lower', {
      defaultMessage: 'Lower Case',
    }),
  },
  {
    kind: 'upper',
    text: i18n.translate('fieldFormats.string.transformOptions.upper', {
      defaultMessage: 'Upper Case',
    }),
  },
  {
    kind: 'title',
    text: i18n.translate('fieldFormats.string.transformOptions.title', {
      defaultMessage: 'Title Case',
    }),
  },
  {
    kind: 'short',
    text: i18n.translate('fieldFormats.string.transformOptions.short', {
      defaultMessage: 'Short Dots',
    }),
  },
  {
    kind: 'base64',
    text: i18n.translate('fieldFormats.string.transformOptions.base64', {
      defaultMessage: 'Base64 Decode',
    }),
  },
  {
    kind: 'urlparam',
    text: i18n.translate('fieldFormats.string.transformOptions.url', {
      defaultMessage: 'URL Param Decode',
    }),
  },
];
const DEFAULT_TRANSFORM_OPTION = false;

/** @public */
export class StringFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.STRING;
  static title = i18n.translate('fieldFormats.string.title', {
    defaultMessage: 'String',
  });
  static fieldType = [
    KBN_FIELD_TYPES.NUMBER,
    KBN_FIELD_TYPES.NUMBER_RANGE,
    KBN_FIELD_TYPES.BOOLEAN,
    KBN_FIELD_TYPES.DATE,
    KBN_FIELD_TYPES.DATE_RANGE,
    KBN_FIELD_TYPES.IP,
    KBN_FIELD_TYPES.IP_RANGE,
    KBN_FIELD_TYPES.ATTACHMENT,
    KBN_FIELD_TYPES.GEO_POINT,
    KBN_FIELD_TYPES.GEO_SHAPE,
    KBN_FIELD_TYPES.STRING,
    KBN_FIELD_TYPES.MURMUR3,
    KBN_FIELD_TYPES.UNKNOWN,
    KBN_FIELD_TYPES.CONFLICT,
  ];
  static transformOptions = TRANSFORM_OPTIONS;

  getParamDefaults() {
    return {
      transform: DEFAULT_TRANSFORM_OPTION,
    };
  }

  private base64Decode(val: string) {
    try {
      if (window && window.atob) return window.atob(val);
      // referencing from `global` tricks webpack to not include `Buffer` polyfill into this bundle
      return global.Buffer.from(val, 'base64').toString('utf8');
    } catch (e) {
      return asPrettyString(val);
    }
  }

  private toTitleCase(val: string) {
    return val.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  textConvert: TextContextTypeConvert = (val: string | number, options) => {
    if (val === '') {
      return emptyLabel;
    }
    switch (this.param('transform')) {
      case 'lower':
        return String(val).toLowerCase();
      case 'upper':
        return String(val).toUpperCase();
      case 'title':
        return this.toTitleCase(String(val));
      case 'short':
        return asPrettyString(shortenDottedString(val), options);
      case 'base64':
        return this.base64Decode(String(val));
      case 'urlparam':
        return decodeURIComponent(String(val));
      default:
        return asPrettyString(val, options);
    }
  };

  htmlConvert: HtmlContextTypeConvert = (val, { hit, field } = {}) => {
    if (val === '') {
      return `<span class="ffString__emptyValue">${emptyLabel}</span>`;
    }

    return hit?.highlight?.[field?.name!]
      ? getHighlightHtml(escape(val), hit.highlight[field!.name])
      : escape(this.textConvert(val));
  };
}
