/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '../field_format';
import { TextContextTypeConvert, FIELD_FORMAT_IDS } from '../types';

/** @public */
export class SourceFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS._SOURCE;
  static title = '_source';
  static fieldType = KBN_FIELD_TYPES._SOURCE;

  textConvert: TextContextTypeConvert = (value: string) => JSON.stringify(value);
}
