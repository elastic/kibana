/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FieldFormat } from '../field_format';
import { TextContextTypeConvert, FIELD_FORMAT_IDS, FieldFormatInstanceType } from '../types';

export const createCustomFieldFormat = (convert: TextContextTypeConvert): FieldFormatInstanceType =>
  class CustomFieldFormat extends FieldFormat {
    static id = FIELD_FORMAT_IDS.CUSTOM;

    textConvert = convert;
  };
