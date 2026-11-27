/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { insertPendingPreview } from './preview_pending';

describe('insertPendingPreview', () => {
  it('marks the preview as pending before inserting it and keeps the mark on success', () => {
    const ref = { current: false };
    const insertPreview = jest.fn(() => {
      expect(ref.current).toBe(true);
      return 'inserted';
    });

    expect(insertPendingPreview(ref, insertPreview)).toBe('inserted');
    expect(ref.current).toBe(true);
  });

  it('clears the mark and rethrows when inserting the preview fails', () => {
    const ref = { current: false };
    const error = new Error('boom');

    expect(() =>
      insertPendingPreview(ref, () => {
        throw error;
      })
    ).toThrow(error);
    expect(ref.current).toBe(false);
  });

  it('just runs the callback when there is no ref', () => {
    expect(insertPendingPreview(undefined, () => 42)).toBe(42);
  });
});
