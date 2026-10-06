/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { FIELD_FORMAT_IDS } from '../../../common';
import { FieldFormat } from '../../../common';
import type { TextContextTypeConvert } from '../../../common/types';
export declare class DateFormat extends FieldFormat {
  static id: FIELD_FORMAT_IDS;
  static title: string;
  static fieldType: KBN_FIELD_TYPES;
  private memoizedConverter;
  private memoizedPattern;
  private timeZone;
  getParamDefaults(): {
    pattern: import('@kbn/utility-types').Serializable;
    timezone: import('@kbn/utility-types').Serializable;
  };
  textConvert: TextContextTypeConvert;
}
