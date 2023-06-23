/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { isTypeSupportedByCellActions } from './utils';

describe('isTypeSupportedByCellActions', () => {
  it('returns true if the type is number', () => {
    expect(isTypeSupportedByCellActions(KBN_FIELD_TYPES.NUMBER)).toBe(true);
  });

  it('returns true if the type is string', () => {
    expect(isTypeSupportedByCellActions(KBN_FIELD_TYPES.STRING)).toBe(true);
  });

  it('returns true if the type is ip', () => {
    expect(isTypeSupportedByCellActions(KBN_FIELD_TYPES.IP)).toBe(true);
  });

  it('returns true if the type is date', () => {
    expect(isTypeSupportedByCellActions(KBN_FIELD_TYPES.DATE)).toBe(true);
  });

  it('returns false if the type is boolean', () => {
    expect(isTypeSupportedByCellActions(KBN_FIELD_TYPES.BOOLEAN)).toBe(false);
  });

  it('returns false if the type is unknown', () => {
    expect(isTypeSupportedByCellActions(KBN_FIELD_TYPES.BOOLEAN)).toBe(false);
  });
});
