/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KBN_FIELD_TYPES } from '@kbn/field-types';
import { FieldFormat } from '../field_format';
import type { TextContextTypeConvert } from '../types';
import type { FIELD_FORMAT_IDS } from '../types';
/** @public */
export declare class IpFormat extends FieldFormat {
  static id: FIELD_FORMAT_IDS;
  static title: string;
  static fieldType: KBN_FIELD_TYPES;
  textConvert: TextContextTypeConvert;
}
