/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { KBN_FIELD_TYPES } from '../../kbn_field_types/types';
import { FieldFormat } from '../field_format';
import { TextContextTypeConvert, FIELD_FORMAT_IDS } from '../types';

function convertLookupEntriesToMap(lookupEntries: any[]) {
  return lookupEntries.reduce(
    (lookupMap: Record<string, any>, lookupEntry: Record<string, any>) => {
      lookupMap[lookupEntry.key] = lookupEntry.value;
      return lookupMap;
    },
    {}
  );
}

export class StaticLookupFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.STATIC_LOOKUP;
  static title = i18n.translate('data.fieldFormats.static_lookup.title', {
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

  textConvert: TextContextTypeConvert = (val) => {
    const lookupEntries = this.param('lookupEntries');
    const unknownKeyValue = this.param('unknownKeyValue');

    const lookupMap = convertLookupEntriesToMap(lookupEntries);
    return lookupMap[val] || unknownKeyValue || val;
  };
}
