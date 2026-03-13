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
import { FieldFormat } from '../field_format';
import type { TextContextTypeConvert } from '../types';
import { FIELD_FORMAT_IDS } from '../types';

function convertLookupEntriesToMap(
  lookupEntries: Array<{ key: string; value: unknown }>
): Record<string, unknown> {
  return lookupEntries.reduce(
    (lookupMap: Record<string, unknown>, lookupEntry: { key: string; value: unknown }) => {
      lookupMap[lookupEntry.key] = lookupEntry.value;

      /**
       * Do some key translations because Elasticsearch returns
       * boolean-type aggregation results as 0 and 1
       */
      if (lookupEntry.key === 'true') {
        lookupMap[1] = lookupEntry.value;
      }

      if (lookupEntry.key === 'false') {
        lookupMap[0] = lookupEntry.value;
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

  textConvert: TextContextTypeConvert = (val: string) => {
    const lookupEntries = this.param('lookupEntries');
    const unknownKeyValue = this.param('unknownKeyValue');

    const lookupMap = convertLookupEntriesToMap(lookupEntries);
    return lookupMap[val] || unknownKeyValue || val;
  };
}
