/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { asPrettyString, getHighlightReact, shortenDottedString } from '../utils';
import { highlightTags } from '../utils/highlight/highlight_tags';
import { FieldFormat } from '../field_format';
import type { ReactContextTypeHit, ReactConvertFunction, TextContextTypeConvert } from '../types';
import { FIELD_FORMAT_IDS } from '../types';

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

  textConvert: TextContextTypeConvert = (val, options) => {
    const missing = this.checkForMissingValueText(val);
    if (missing) {
      return missing;
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

  reactConvert: ReactConvertFunction = (val, { hit, field } = {}) => {
    const missing = this.checkForMissingValueReact(val);
    if (missing) return missing;

    const formatted = this.textConvert(val);
    const fieldName = field?.name;

    return getHighlightReact(
      formatted,
      fieldName,
      this.applyTransformsToHighlightHit(hit, fieldName)
    );
  };

  /**
   * Applies the selected transform (if any) to the content of the highlighted snippets so they
   * can match with the field value. Base64 and URL param are not supported.
   */
  private applyTransformsToHighlightHit(
    hit: ReactContextTypeHit | undefined,
    fieldName: string | undefined
  ): ReactContextTypeHit | undefined {
    const substrings = fieldName ? hit?.highlight?.[fieldName] : undefined;
    if (!hit || !fieldName || !substrings?.length) return hit;

    const transformText = this.getTextTransform();
    if (!transformText) return hit;

    return {
      ...hit,
      highlight: {
        ...hit.highlight,
        [fieldName]: substrings.map((snippet) => this.transformSnippetText(snippet, transformText)),
      },
    };
  }

  private getTextTransform(): ((text: string) => string) | null {
    switch (this.param('transform')) {
      case 'lower':
        return (text) => text.toLowerCase();
      case 'upper':
        return (text) => text.toUpperCase();
      case 'title':
        return (text) => this.toTitleCase(text);
      case 'short':
        return (text) => String(shortenDottedString(text));
      default:
        return null;
    }
  }

  /**
   * Applies a text transform to a highlight snippet while leaving the Kibana
   * highlight tags untouched, so the tags still match when the snippet is located
   * within the transformed value.
   */
  private transformSnippetText(snippet: string, transformText: (text: string) => string): string {
    const { pre, post } = highlightTags;
    return snippet
      .split(pre)
      .map((segment, index) => {
        if (index === 0) return transformText(segment);

        const postIndex = segment.indexOf(post);
        if (postIndex === -1) return pre + transformText(segment);

        const highlighted = segment.slice(0, postIndex);
        const rest = segment.slice(postIndex + post.length);
        return pre + transformText(highlighted) + post + transformText(rest);
      })
      .join('');
  }
}
