/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import escape from 'lodash/escape';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '../field_format';
import type {
  HtmlContextTypeConvert,
  ReactContextTypeSingleConvert,
  TextContextTypeConvert,
} from '../types';
import { FIELD_FORMAT_IDS } from '../types';
import { getHighlightHtml, getHighlightReact, checkForMissingValueHtml } from '../utils';

function convertLookupEntriesToMap(
  lookupEntries: Array<{ key?: string | null; value: unknown }>
): Record<string, unknown> {
  return lookupEntries.reduce(
    (lookupMap: Record<string, unknown>, lookupEntry: { key?: string | null; value: unknown }) => {
      const { key, value } = lookupEntry;
      // Skip entries where both key and value are not defined
      const hasKey = key != null && key !== '';
      const hasValue = value != null && value !== '';
      if (!hasKey && !hasValue) {
        return lookupMap;
      }

      // Normalize undefined/null keys to empty string when value is defined
      const normalizedKey = key ?? '';
      lookupMap[normalizedKey] = value;

      /**
       * Do some key translations because Elasticsearch returns
       * boolean-type aggregation results as 0 and 1
       */
      if (normalizedKey === 'true') {
        lookupMap[1] = value;
      }

      if (normalizedKey === 'false') {
        lookupMap[0] = value;
      }

      return lookupMap;
    },
    {} as Record<string, unknown>
  );
}

/** @public */
export class StaticLookupFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.STATIC_LOOKUP;
  static title = i18n.translate('fieldFormats.static_lookup.title', {
    defaultMessage: 'Static lookup',
  });
  static fieldType = [
    KBN_FIELD_TYPES.STRING,
    KBN_FIELD_TYPES.NUMBER,
    KBN_FIELD_TYPES.IP,
    KBN_FIELD_TYPES.BOOLEAN,
  ];

  getParamDefaults() {
    return {
      lookupEntries: [{}],
      unknownKeyValue: null,
    };
  }

  private lookup(val: unknown): { result: unknown; isMissingValue: boolean } {
    const lookupEntries = this.param('lookupEntries');
    const unknownKeyValue = this.param('unknownKeyValue');
    const lookupMap = convertLookupEntriesToMap(lookupEntries);

    // Guard against null/undefined - these should not be mapped, stay as missing values
    if (val == null) {
      return { result: val, isMissingValue: true };
    }

    const key = String(val);
    // Use Object.hasOwn to check key existence (handles falsy mapped values like '' and avoids prototype chain)
    if (Object.hasOwn(lookupMap, key)) {
      return { result: lookupMap[key], isMissingValue: false };
    }

    // Use unknownKeyValue for unmatched keys (including empty string)
    if (unknownKeyValue != null) {
      return { result: unknownKeyValue, isMissingValue: false };
    }

    return { result: val, isMissingValue: true };
  }

  textConvert: TextContextTypeConvert = (val: string) => {
    const { result, isMissingValue } = this.lookup(val);

    if (isMissingValue) {
      const missingText = this.checkForMissingValueText(result);
      if (missingText) {
        return missingText;
      }
    }

    return String(result ?? '');
  };

  /**
   * @deprecated
   * Kept intentionally alongside `reactConvertSingle` because the HTML fallback in
   * `html_content_type.ts` pre-checks the **raw input** for missing values (null, undefined,
   * empty string) before ever calling `textConvert`. This means values like `''` that have a
   * valid lookup mapping would be swallowed and rendered as "(blank)" instead of their mapped
   * label. Once the HTML bridge is fully removed this method can be deleted.
   */
  htmlConvert: HtmlContextTypeConvert = (value, options = {}) => {
    const { result, isMissingValue } = this.lookup(value);

    if (isMissingValue) {
      const missingHtml = checkForMissingValueHtml(result);
      if (missingHtml) {
        return missingHtml;
      }
    }

    // Escape the result and handle highlights
    const { field, hit } = options;
    const formatted = escape(String(result ?? ''));

    return !field || !hit || !hit.highlight || !hit.highlight[field.name]
      ? formatted
      : getHighlightHtml(formatted, hit.highlight[field.name]);
  };

  reactConvertSingle: ReactContextTypeSingleConvert = (val, options = {}) => {
    const { result, isMissingValue } = this.lookup(val);

    if (isMissingValue) {
      const missing = this.checkForMissingValueReact(result);
      if (missing) return missing;
    }

    const { field, hit } = options;
    const formatted = String(result ?? '');

    const fieldName = field?.name;
    if (fieldName && hit?.highlight?.[fieldName]) {
      return getHighlightReact(formatted, hit.highlight[fieldName]);
    }

    return formatted;
  };
}
