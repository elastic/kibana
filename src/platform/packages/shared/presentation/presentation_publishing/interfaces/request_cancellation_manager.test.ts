/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AbortReason } from '@kbn/kibana-utils-plugin/common';
import { RequestCancellationManager } from './request_cancellation_manager';

describe('RequestCancellationManager', () => {
  it('aborts the requests in the current load', () => {
    const manager = new RequestCancellationManager();

    manager.startLoad();
    manager.cancel(AbortReason.CANCELED);

    expect(manager.signal.aborted).toBe(true);
    expect(manager.signal.reason).toBe(AbortReason.CANCELED);
  });

  it('keeps a pre-load cancellation in effect until the next load', () => {
    const manager = new RequestCancellationManager();

    manager.cancel();
    const canceledSignal = manager.signal;
    manager.startLoad();

    expect(manager.signal).toBe(canceledSignal);
    expect(manager.signal.aborted).toBe(true);

    manager.startLoad();

    expect(manager.signal).not.toBe(canceledSignal);
    expect(manager.signal.aborted).toBe(false);
  });

  it('replaces and aborts the prior load when a new one starts', () => {
    const manager = new RequestCancellationManager();

    manager.startLoad();
    const priorLoadSignal = manager.signal;
    manager.startLoad();

    expect(priorLoadSignal.aborted).toBe(true);
    expect(priorLoadSignal.reason).toBe(AbortReason.REPLACED);
    expect(manager.signal.aborted).toBe(false);
  });

  it('resumes future automatic refreshes after cancellation', () => {
    const manager = new RequestCancellationManager();

    manager.startLoad();
    const canceledSignal = manager.signal;
    manager.cancel();
    manager.resumeAfterCancellation();

    expect(canceledSignal.aborted).toBe(true);
    expect(manager.signal).not.toBe(canceledSignal);
    expect(manager.signal.aborted).toBe(false);
  });

  describe('createChildController', () => {
    it('creates a non-aborted controller when the manager has not been cancelled', () => {
      const manager = new RequestCancellationManager();
      manager.startLoad();

      const child = manager.createChildController();

      expect(child.signal.aborted).toBe(false);
    });

    it('is born aborted, inheriting the reason, when the manager is already cancelled', () => {
      const manager = new RequestCancellationManager();
      manager.cancel(AbortReason.CANCELED);

      const child = manager.createChildController();

      expect(child.signal.aborted).toBe(true);
      expect(child.signal.reason).toBe(AbortReason.CANCELED);
    });

    it('aborts, inheriting the reason, when the manager is cancelled afterwards', () => {
      const manager = new RequestCancellationManager();
      manager.startLoad();

      const child = manager.createChildController();
      expect(child.signal.aborted).toBe(false);

      manager.cancel(AbortReason.TIMEOUT);

      expect(child.signal.aborted).toBe(true);
      expect(child.signal.reason).toBe(AbortReason.TIMEOUT);
    });

    it('aborts with AbortReason.REPLACED when a new load starts', () => {
      const manager = new RequestCancellationManager();
      manager.startLoad();

      const child = manager.createChildController();
      manager.startLoad();

      expect(child.signal.aborted).toBe(true);
      expect(child.signal.reason).toBe(AbortReason.REPLACED);
    });

    it('does not abort a child created for a prior, already-replaced load', () => {
      const manager = new RequestCancellationManager();
      manager.startLoad();
      manager.startLoad();

      const child = manager.createChildController();
      expect(child.signal.aborted).toBe(false);

      // aborting the child's own controller directly should not affect the manager
      child.abort();
      expect(manager.signal.aborted).toBe(false);
    });
  });
});
