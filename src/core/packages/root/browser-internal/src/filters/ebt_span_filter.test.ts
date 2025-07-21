/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';
import { ebtSpanFilter, type Payload } from './ebt_span_filter';
import { mockedKibanaBrowserPayload, mockedRandomTransactionPayload } from './ebt_span_filter.mock';

describe('ebtSpanFilter', () => {
  it('filters out transactions that only have ebt spans', () => {
    const payload: Payload = _.cloneDeep(mockedKibanaBrowserPayload);
    const result = ebtSpanFilter(payload);
    expect(result).toEqual({
      errors: [],
      transactions: [],
    });
  });

  it('does not modify non-user-interaction type transactions', () => {
    const payload: Payload = _.cloneDeep(mockedRandomTransactionPayload);
    const result = ebtSpanFilter(payload);
    expect(result).toEqual(mockedRandomTransactionPayload);
  });

  it('does not throw if payload is empty', () => {
    const payload: Payload = {};
    expect(() => ebtSpanFilter(payload)).not.toThrow();
    expect(ebtSpanFilter(payload)).toEqual({});
  });
});
