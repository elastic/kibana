/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { NumberFormatEditor } from '../number';
import { defaultState } from '../default';

export class BytesFormatEditor extends NumberFormatEditor {
  static formatId = 'bytes';
  state = {
    ...defaultState,
    sampleInputs: [256, 1024, 5150000, 1990000000],
  };
}
