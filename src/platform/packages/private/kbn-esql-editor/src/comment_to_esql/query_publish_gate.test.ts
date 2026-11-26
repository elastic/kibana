/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { runWithPublishHold } from './query_publish_gate';
import type { QueryPublishGateRef } from './query_publish_gate';

const createGate = (): QueryPublishGateRef => ({
  current: { hold: jest.fn(), release: jest.fn() },
});

describe('runWithPublishHold', () => {
  it('holds before the preview is inserted and keeps the hold on success', () => {
    const gate = createGate();
    const insertPreview = jest.fn(() => {
      expect(gate.current.hold).toHaveBeenCalledTimes(1);
      return 'inserted';
    });

    expect(runWithPublishHold(gate, insertPreview)).toBe('inserted');
    expect(gate.current.release).not.toHaveBeenCalled();
  });

  it('releases the hold and rethrows when inserting the preview fails', () => {
    const gate = createGate();
    const error = new Error('boom');

    expect(() =>
      runWithPublishHold(gate, () => {
        throw error;
      })
    ).toThrow(error);
    expect(gate.current.release).toHaveBeenCalledTimes(1);
  });

  it('just runs the callback when there is no gate', () => {
    expect(runWithPublishHold(undefined, () => 42)).toBe(42);
  });
});
