/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NumberFormatEditor } from '../number/number';
import { defaultState } from '../default';
import { formatId } from './constants';

export class BytesFormatEditor extends NumberFormatEditor {
  static formatId = formatId;
  state = {
    ...defaultState,
    sampleInputs: [256, 1024, 5150000, 1990000000],
  };
}
