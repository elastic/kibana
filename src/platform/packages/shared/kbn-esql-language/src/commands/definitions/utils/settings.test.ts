/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { synth } from '../../../composer';
import { UnmappedFieldsStrategy } from '../../registry/types';
import { getUnmappedFieldsStrategy } from './settings';

describe('getUnmappedFieldsStrategy', () => {
  it('should return FAIL strategy if no headers are provided', () => {
    const strategy = getUnmappedFieldsStrategy();
    expect(strategy).toBe(UnmappedFieldsStrategy.FAIL);
  });

  it('should return FAIL strategy if unmapped_fields setting is not provided', () => {
    const headers = [synth.header`SET timezone = "GMT+1"`];
    const strategy = getUnmappedFieldsStrategy(headers);
    expect(strategy).toBe(UnmappedFieldsStrategy.FAIL);
  });

  it('should return FAIL strategy if unmapped_fields setting is not valid', () => {
    const headers = [synth.header`SET unmapped_fields = "wrong_value"`];
    const strategy = getUnmappedFieldsStrategy(headers);
    expect(strategy).toBe(UnmappedFieldsStrategy.FAIL);
  });

  it('should return the FAIL strategy based on the unmapped_fields setting', () => {
    const headers = [synth.header`SET unmapped_fields = "FAIL"`];
    const strategy = getUnmappedFieldsStrategy(headers);
    expect(strategy).toBe(UnmappedFieldsStrategy.FAIL);
  });

  it('should return the LOAD strategy based on the unmapped_fields setting', () => {
    const headers = [synth.header`SET unmapped_fields = "LOAD"`];
    const strategy = getUnmappedFieldsStrategy(headers);
    expect(strategy).toBe(UnmappedFieldsStrategy.LOAD);
  });

  it('should return the NULLIFY strategy based on the unmapped_fields setting', () => {
    const headers = [synth.header`SET unmapped_fields = "NULLIFY"`];
    const strategy = getUnmappedFieldsStrategy(headers);
    expect(strategy).toBe(UnmappedFieldsStrategy.NULLIFY);
  });

  it('should be case insensitive', () => {
    const headers = [synth.header`SET unmapped_fields = "nullify"`];
    const strategy = getUnmappedFieldsStrategy(headers);
    expect(strategy).toBe(UnmappedFieldsStrategy.NULLIFY);
  });
});
