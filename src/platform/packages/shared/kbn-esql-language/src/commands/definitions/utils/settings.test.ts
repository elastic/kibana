/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { synth } from '../../../composer';
import { UnmappedFieldsTreatment } from '../../registry/types';
import { getUnmappedFieldsTreatment } from './settings';

describe('getUnmappedFieldsTreatment', () => {
  it('should return FAIL treatment if no headers are provided', () => {
    const treatment = getUnmappedFieldsTreatment();
    expect(treatment).toBe(UnmappedFieldsTreatment.FAIL);
  });

  it('should return FAIL treatment if unmapped_fields setting is not provided', () => {
    const headers = [synth.header`SET timezone = "GMT+1"`];
    const treatment = getUnmappedFieldsTreatment(headers);
    expect(treatment).toBe(UnmappedFieldsTreatment.FAIL);
  });

  it('should return FAIL treatment if unmapped_fields setting is not valid', () => {
    const headers = [synth.header`SET unmapped_fields = "wrong_value"`];
    const treatment = getUnmappedFieldsTreatment(headers);
    expect(treatment).toBe(UnmappedFieldsTreatment.FAIL);
  });

  it('should return the FAIL treatment based on the unmapped_fields setting', () => {
    const headers = [synth.header`SET unmapped_fields = "FAIL"`];
    const treatment = getUnmappedFieldsTreatment(headers);
    expect(treatment).toBe(UnmappedFieldsTreatment.FAIL);
  });

  it('should return the LOAD treatment based on the unmapped_fields setting', () => {
    const headers = [synth.header`SET unmapped_fields = "LOAD"`];
    const treatment = getUnmappedFieldsTreatment(headers);
    expect(treatment).toBe(UnmappedFieldsTreatment.LOAD);
  });

  it('should return the NULLIFY treatment based on the unmapped_fields setting', () => {
    const headers = [synth.header`SET unmapped_fields = "NULLIFY"`];
    const treatment = getUnmappedFieldsTreatment(headers);
    expect(treatment).toBe(UnmappedFieldsTreatment.NULLIFY);
  });

  it('should ignore cases', () => {
    const headers = [synth.header`SET unmapped_fields = "nullify"`];
    const treatment = getUnmappedFieldsTreatment(headers);
    expect(treatment).toBe(UnmappedFieldsTreatment.NULLIFY);
  });
});
