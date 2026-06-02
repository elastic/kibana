/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NumeralFormat } from './numeral';
import type { TextContextTypeConvert } from '../types';
import type { FIELD_FORMAT_IDS } from '../types';
/** @public */
export declare class PercentFormat extends NumeralFormat {
  static id: FIELD_FORMAT_IDS;
  static title: string;
  id: FIELD_FORMAT_IDS;
  title: string;
  allowsNumericalAggregations: boolean;
  getParamDefaults: () => {
    pattern: import('@kbn/utility-types').Serializable;
    fractional: boolean;
    alwaysShowSign: boolean;
  };
  textConvert: TextContextTypeConvert;
}
