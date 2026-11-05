/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { blankVariantValue, inferVariant } from './form_variants';
import { getStepFormSchema } from './step_form_schema';

const variants = (() => {
  const field = getStepFormSchema('while', [])?.fields.find((f) => f.key === 'max-iterations');
  if (!field?.variants) throw new Error('max-iterations should be a choice of shapes');
  return field.variants;
})();
const [number, limit] = variants;

describe('inferVariant', () => {
  it('picks the variant whose schema accepts the value', () => {
    expect(inferVariant(variants, 10)).toBe(number);
    expect(inferVariant(variants, { limit: 5, 'on-limit': 'fail' })).toBe(limit);
  });

  it('picks the closest object variant for a half-filled value', () => {
    expect(inferVariant(variants, { limit: 5 })).toBe(limit);
  });

  it('is the first variant while there is no value, or nothing fits', () => {
    expect(inferVariant(variants, undefined)).toBe(number);
    expect(inferVariant(variants, 'ten')).toBe(number);
  });
});

describe('blankVariantValue', () => {
  it('starts an object variant from an empty map and a scalar one from nothing', () => {
    expect(blankVariantValue(limit)).toEqual({});
    expect(blankVariantValue(number)).toBeUndefined();
  });
});
