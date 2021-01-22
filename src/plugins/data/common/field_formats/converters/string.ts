/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { asPrettyString } from '../utils';
import { KBN_FIELD_TYPES } from '../../kbn_field_types/types';
import { FieldFormat } from '../field_format';
import { TextContextTypeConvert, FIELD_FORMAT_IDS } from '../types';
import { shortenDottedString } from '../../utils';

const TRANSFORM_OPTIONS = [
  {
    kind: false,
    text: i18n.translate('data.fieldFormats.string.transformOptions.none', {
      defaultMessage: '- None -',
    }),
  },
  {
    kind: 'lower',
    text: i18n.translate('data.fieldFormats.string.transformOptions.lower', {
      defaultMessage: 'Lower Case',
    }),
  },
  {
    kind: 'upper',
    text: i18n.translate('data.fieldFormats.string.transformOptions.upper', {
      defaultMessage: 'Upper Case',
    }),
  },
  {
    kind: 'title',
    text: i18n.translate('data.fieldFormats.string.transformOptions.title', {
      defaultMessage: 'Title Case',
    }),
  },
  {
    kind: 'short',
    text: i18n.translate('data.fieldFormats.string.transformOptions.short', {
      defaultMessage: 'Short Dots',
    }),
  },
  {
    kind: 'base64',
    text: i18n.translate('data.fieldFormats.string.transformOptions.base64', {
      defaultMessage: 'Base64 Decode',
    }),
  },
  {
    kind: 'urlparam',
    text: i18n.translate('data.fieldFormats.string.transformOptions.url', {
      defaultMessage: 'URL Param Decode',
    }),
  },
];
const DEFAULT_TRANSFORM_OPTION = false;

export class StringFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.STRING;
  static title = i18n.translate('data.fieldFormats.string.title', {
    defaultMessage: 'String',
  });
  static fieldType = [
    KBN_FIELD_TYPES.NUMBER,
    KBN_FIELD_TYPES.BOOLEAN,
    KBN_FIELD_TYPES.DATE,
    KBN_FIELD_TYPES.IP,
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
      return Buffer.from(val, 'base64').toString('utf8');
    } catch (e) {
      return asPrettyString(val);
    }
  }

  private toTitleCase(val: string) {
    return val.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  textConvert: TextContextTypeConvert = (val) => {
    switch (this.param('transform')) {
      case 'lower':
        return String(val).toLowerCase();
      case 'upper':
        return String(val).toUpperCase();
      case 'title':
        return this.toTitleCase(val);
      case 'short':
        return shortenDottedString(val);
      case 'base64':
        return this.base64Decode(val);
      case 'urlparam':
        return decodeURIComponent(val);
      default:
        return asPrettyString(val);
    }
  };
}
