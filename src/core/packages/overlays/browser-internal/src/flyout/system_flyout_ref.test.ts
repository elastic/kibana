/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SystemFlyoutRef } from './system_flyout_ref';

const mockRoot = { render: jest.fn(), unmount: jest.fn() } as any;

beforeEach(() => {
  mockRoot.unmount.mockClear();
});

describe('SystemFlyoutRef', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.setAttribute('data-system-flyout', 'test-flyout');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  describe('constructor', () => {
    it('creates a ref with onClose promise', () => {
      const ref = new SystemFlyoutRef(container, mockRoot);
      expect(ref.onClose).toBeInstanceOf(Promise);
    });
  });

  describe('close()', () => {
    it('unmounts the component and removes the container', async () => {
      const ref = new SystemFlyoutRef(container, mockRoot);
      expect(mockRoot.unmount).not.toHaveBeenCalled();
      expect(document.body.contains(container)).toBe(true);

      await ref.close();

      expect(mockRoot.unmount).toHaveBeenCalled();
      expect(document.body.contains(container)).toBe(false);
    });

    it('resolves the onClose Promise', async () => {
      const ref = new SystemFlyoutRef(container, mockRoot);
      const onCloseComplete = jest.fn();
      ref.onClose.then(onCloseComplete);

      await ref.close();

      expect(onCloseComplete).toHaveBeenCalledTimes(1);
    });

    it('can be called multiple times without error', async () => {
      const ref = new SystemFlyoutRef(container, mockRoot);

      const result1 = await ref.close();
      const result2 = await ref.close();

      // Both should return the same promise
      expect(result1).toBe(result2);
      // Unmount should only happen once
      expect(mockRoot.unmount).toHaveBeenCalledTimes(1);
    });

    it('returns the onClose promise', async () => {
      const ref = new SystemFlyoutRef(container, mockRoot);
      const closePromise = ref.close();

      expect(closePromise).toBe(ref.onClose);
      await closePromise;
    });

    it('only completes the onClose promise once', async () => {
      const ref = new SystemFlyoutRef(container, mockRoot);
      const onCloseComplete = jest.fn();
      ref.onClose.then(onCloseComplete);

      await ref.close();
      await ref.close();
      await ref.close();

      expect(onCloseComplete).toHaveBeenCalledTimes(1);
    });
  });
});
