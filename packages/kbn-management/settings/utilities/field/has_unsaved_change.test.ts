/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { hasUnsavedChange } from './has_unsaved_change';

describe('hasUnsavedChange', () => {
  it('returns false if the unsaved change is undefined', () => {
    expect(hasUnsavedChange({ savedValue: 'foo', defaultValue: 'bar' })).toBe(false);
  });

  it('returns true if the unsaved change value is undefined or null', () => {
    expect(
      hasUnsavedChange({ savedValue: 'foo', defaultValue: 'bar' }, { unsavedValue: undefined })
    ).toBe(true);
    expect(
      hasUnsavedChange({ savedValue: 'foo', defaultValue: 'bar' }, { unsavedValue: null })
    ).toBe(true);
  });

  it('returns false if the unsaved change value is equal to the saved value', () => {
    expect(
      hasUnsavedChange({ savedValue: 'foo', defaultValue: 'bar' }, { unsavedValue: 'foo' })
    ).toBe(false);
  });

  it('returns false if the saved value is undefined, but the unsaved change value is equal to the default value', () => {
    expect(
      hasUnsavedChange({ savedValue: undefined, defaultValue: 'bar' }, { unsavedValue: 'bar' })
    ).toBe(false);
  });

  it('returns true if the unsaved change value is not equal to the saved value', () => {
    expect(
      hasUnsavedChange({ savedValue: 'foo', defaultValue: 'bar' }, { unsavedValue: 'baz' })
    ).toBe(true);
  });

  it('returns true if the saved value is undefined, but the unsaved change value is not equal to the default value', () => {
    expect(
      hasUnsavedChange({ savedValue: undefined, defaultValue: 'bar' }, { unsavedValue: 'baz' })
    ).toBe(true);
  });

  it('returns false if the saved value is undefined, and the unsaved change value is equal to the default value', () => {
    expect(
      hasUnsavedChange({ savedValue: undefined, defaultValue: 'bar' }, { unsavedValue: 'bar' })
    ).toBe(false);
  });
});
