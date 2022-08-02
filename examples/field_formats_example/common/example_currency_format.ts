/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '@kbn/field-formats-plugin/common';

// 1. Create a custom formatter by extending {@link FieldFormat}
export class ExampleCurrencyFormat extends FieldFormat {
  static id = 'example-currency';
  static title = 'Currency (example)';

  // 2. Specify field types that this formatter supports
  static fieldType = KBN_FIELD_TYPES.NUMBER;

  // Or pass an array in case supports multiple types
  // static fieldType = [KBN_FIELD_TYPES.NUMBER, KBN_FIELD_TYPES.DATE];

  // 3. This formats support a `currency` param. Use `EUR` as a default.
  getParamDefaults() {
    return {
      currency: 'EUR',
    };
  }

  // 4. Implement a conversion function
  textConvert = (val: unknown) => {
    if (typeof val !== 'number') return `${val}`;

    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: this.param('currency'),
    }).format(val);
  };
}
