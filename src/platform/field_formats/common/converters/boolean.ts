/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '../field_format';
import { TextContextTypeConvert, FIELD_FORMAT_IDS } from '../types';
import { asPrettyString } from '../utils';

/** @public */
export class BoolFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.BOOLEAN;
  static title = i18n.translate('fieldFormats.boolean.title', {
    defaultMessage: 'Boolean',
  });
  static fieldType = [KBN_FIELD_TYPES.BOOLEAN, KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.STRING];

  textConvert: TextContextTypeConvert = (value: string | number | boolean, options) => {
    if (typeof value === 'string') {
      value = value.trim().toLowerCase();
    }

    switch (value) {
      case false:
      case 0:
      case 'false':
      case 'no':
        return 'false';
      case true:
      case 1:
      case 'true':
      case 'yes':
        return 'true';
      default:
        return asPrettyString(value, options);
    }
  };
}
