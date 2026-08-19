/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isSelectionConfig } from './config';

describe('isSelectionConfig', () => {
  it('returns false for `true`', () => {
    expect(isSelectionConfig(true)).toBe(false);
  });

  it('returns false for `false`', () => {
    expect(isSelectionConfig(false)).toBe(false);
  });

  it('returns false for `undefined`', () => {
    expect(isSelectionConfig(undefined)).toBe(false);
  });

  it('returns true for an empty config object', () => {
    expect(isSelectionConfig({})).toBe(true);
  });

  it('returns true when only `selectable` is provided', () => {
    expect(isSelectionConfig({ selectable: () => true })).toBe(true);
  });

  it('returns true when only `selectableMessage` is provided', () => {
    expect(isSelectionConfig({ selectableMessage: () => undefined })).toBe(true);
  });

  it('returns false for an array', () => {
    // Arrays are objects but not valid SelectionConfig.
    expect(isSelectionConfig([] as unknown as boolean)).toBe(false);
  });

  it('returns false when `selectable` is not a function', () => {
    expect(isSelectionConfig({ selectable: true } as unknown as boolean)).toBe(false);
  });

  it('returns false when `selectableMessage` is not a function', () => {
    expect(isSelectionConfig({ selectableMessage: 'not a function' } as unknown as boolean)).toBe(
      false
    );
  });
});
