/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */
import { warnOnQueryKeyScopeCollision } from './scope_collision_guard';

describe('warnOnQueryKeyScopeCollision', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('in development mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should return noop cleanup for undefined scope', () => {
      const cleanup = warnOnQueryKeyScopeCollision('dashboard', undefined);

      expect(cleanup).toBeInstanceOf(Function);
      expect(console.warn).not.toHaveBeenCalled();

      // Cleanup should work without error.
      cleanup();
    });

    it('should not warn on first registration of a scope', () => {
      const cleanup = warnOnQueryKeyScopeCollision('dashboard', 'scope-1');

      expect(console.warn).not.toHaveBeenCalled();

      cleanup();
    });

    it('should warn when same scope is registered twice for same entityName', () => {
      const cleanup1 = warnOnQueryKeyScopeCollision('dashboard', 'duplicate-scope');
      expect(console.warn).not.toHaveBeenCalled();

      const cleanup2 = warnOnQueryKeyScopeCollision('dashboard', 'duplicate-scope');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Multiple providers detected with entityName="dashboard"')
      );
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('queryKeyScope="duplicate-scope"')
      );

      cleanup1();
      cleanup2();
    });

    it('should not warn when different scopes are used for same entityName', () => {
      const cleanup1 = warnOnQueryKeyScopeCollision('dashboard', 'scope-a');
      const cleanup2 = warnOnQueryKeyScopeCollision('dashboard', 'scope-b');

      expect(console.warn).not.toHaveBeenCalled();

      cleanup1();
      cleanup2();
    });

    it('should not warn when same scope is used for different entityNames', () => {
      const cleanup1 = warnOnQueryKeyScopeCollision('dashboard', 'same-scope');
      const cleanup2 = warnOnQueryKeyScopeCollision('visualization', 'same-scope');

      expect(console.warn).not.toHaveBeenCalled();

      cleanup1();
      cleanup2();
    });

    it('should allow re-registration after cleanup', () => {
      const cleanup1 = warnOnQueryKeyScopeCollision('dashboard', 'reusable-scope');
      cleanup1();

      // After cleanup, re-registering should not warn.
      const cleanup2 = warnOnQueryKeyScopeCollision('dashboard', 'reusable-scope');
      expect(console.warn).not.toHaveBeenCalled();

      cleanup2();
    });

    it('should handle cleanup of non-existent scope gracefully', () => {
      const cleanup = warnOnQueryKeyScopeCollision('dashboard', 'scope-to-cleanup');

      // Call cleanup twice - second call should not throw.
      cleanup();
      expect(() => cleanup()).not.toThrow();
    });

    it('should remove entityName entry when last scope is cleaned up', () => {
      const cleanup1 = warnOnQueryKeyScopeCollision('maps', 'only-scope');
      cleanup1();

      // Register a new scope - should not warn since the entityName was removed.
      const cleanup2 = warnOnQueryKeyScopeCollision('maps', 'only-scope');
      expect(console.warn).not.toHaveBeenCalled();

      cleanup2();
    });

    it('should track multiple scopes for same entityName independently', () => {
      const cleanup1 = warnOnQueryKeyScopeCollision('lens', 'scope-1');
      const cleanup2 = warnOnQueryKeyScopeCollision('lens', 'scope-2');
      const cleanup3 = warnOnQueryKeyScopeCollision('lens', 'scope-3');

      expect(console.warn).not.toHaveBeenCalled();

      // Cleanup scope-2, scope-1 and scope-3 should still be tracked.
      cleanup2();

      // Re-registering scope-2 should not warn.
      const cleanup4 = warnOnQueryKeyScopeCollision('lens', 'scope-2');
      expect(console.warn).not.toHaveBeenCalled();

      cleanup1();
      cleanup3();
      cleanup4();
    });
  });

  describe('in production mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should return noop cleanup and not warn', () => {
      const cleanup1 = warnOnQueryKeyScopeCollision('dashboard', 'scope-1');
      const cleanup2 = warnOnQueryKeyScopeCollision('dashboard', 'scope-1');

      expect(console.warn).not.toHaveBeenCalled();

      // Cleanup should work without error.
      cleanup1();
      cleanup2();
    });

    it('should not track scopes in production', () => {
      const cleanup = warnOnQueryKeyScopeCollision('dashboard', 'prod-scope');

      // Calling cleanup should be a no-op.
      cleanup();
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe('in test mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('should return noop cleanup and not warn', () => {
      const cleanup = warnOnQueryKeyScopeCollision('dashboard', 'test-scope');

      expect(console.warn).not.toHaveBeenCalled();
      cleanup();
    });
  });
});
