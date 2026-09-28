/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  clearActiveDataReferenceInsertTarget,
  insertIntoActiveDataReferenceTarget,
  setActiveDataReferenceInsertTarget,
} from './active_data_reference_insert_target';

describe('active_data_reference_insert_target', () => {
  it('delivers tokens to the registered target', () => {
    const target = jest.fn();
    setActiveDataReferenceInsertTarget(target);
    expect(insertIntoActiveDataReferenceTarget('{{ steps.a.output }}')).toBe(true);
    expect(target).toHaveBeenCalledWith('{{ steps.a.output }}');
    clearActiveDataReferenceInsertTarget(target);
  });

  it('returns false when no target is registered', () => {
    expect(insertIntoActiveDataReferenceTarget('{{ x }}')).toBe(false);
  });

  it('does not clear a newer target when an older owner unmounts', () => {
    const first = jest.fn();
    const second = jest.fn();
    setActiveDataReferenceInsertTarget(first);
    setActiveDataReferenceInsertTarget(second);
    clearActiveDataReferenceInsertTarget(first);
    expect(insertIntoActiveDataReferenceTarget('{{ y }}')).toBe(true);
    expect(second).toHaveBeenCalledWith('{{ y }}');
    expect(first).not.toHaveBeenCalled();
    clearActiveDataReferenceInsertTarget(second);
  });
});
