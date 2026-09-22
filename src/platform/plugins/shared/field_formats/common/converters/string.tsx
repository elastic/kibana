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

// Highlight tag sentinels that are not affected by text transforms (lowercase/uppercase).
const HIGHLIGHT_TAG_SENTINELS = { pre: '\u0000', post: '\u0001' };

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
      if (typeof window !== 'undefined' && window.atob) {
        // atob produces a binary (latin1) string; decode its bytes as UTF-8 to handle multi-byte characters
        return new TextDecoder().decode(
          Uint8Array.from(window.atob(val), (char) => char.charCodeAt(0))
        );
      }
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
   * Applies the selected transform (if any) to the highlighted snippets so they still align with
   * the transformed field value. Only case transforms (lower/upper/title) are handled: they
   * preserve character positions, so each snippet can be transformed as a whole. Short Dots,
   *  Base64 and URL Param move characters around, so they are left out and their highlights are simply dropped.
   */
  private applyTransformsToHighlightHit(
    hit: ReactContextTypeHit | undefined,
    fieldName: string | undefined
  ): ReactContextTypeHit | undefined {
    const substrings = fieldName ? hit?.highlight?.[fieldName] : undefined;
    if (!hit || !fieldName || !substrings?.length) return hit;

    const caseTransforms: Record<string, (text: string) => string> = {
      lower: (text) => text.toLowerCase(),
      upper: (text) => text.toUpperCase(),
      title: (text) => this.toTitleCase(text),
    };
    const transform = caseTransforms[this.param('transform')];
    if (!transform) return hit;

    const { pre, post } = highlightTags;
    const { pre: preSentinel, post: postSentinel } = HIGHLIGHT_TAG_SENTINELS;

    return {
      ...hit,
      highlight: {
        ...hit.highlight,
        [fieldName]: substrings.map((snippet) => {
          const masked = snippet.split(pre).join(preSentinel).split(post).join(postSentinel);
          const transformed = transform(masked);
          const unmasked = transformed.split(preSentinel).join(pre).split(postSentinel).join(post);
          return unmasked;
        }),
      },
    };
  }
}
