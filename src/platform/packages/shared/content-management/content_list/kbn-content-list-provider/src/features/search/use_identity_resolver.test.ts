/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { useIdentityResolver } from './use_identity_resolver';

describe('useIdentityResolver', () => {
  describe('initial state', () => {
    it('should start with version 0', () => {
      const { result } = renderHook(() => useIdentityResolver());

      expect(result.current.version).toBe(0);
    });

    it('should return input value when no mappings exist for getCanonical', () => {
      const { result } = renderHook(() => useIdentityResolver());

      expect(result.current.getCanonical('unknown-user')).toBe('unknown-user');
    });

    it('should return input value when no mappings exist for getDisplay', () => {
      const { result } = renderHook(() => useIdentityResolver());

      expect(result.current.getDisplay('u_abc123')).toBe('u_abc123');
    });
  });

  describe('register', () => {
    it('should register a display to canonical mapping', () => {
      const { result } = renderHook(() => useIdentityResolver());

      act(() => {
        result.current.register('john.doe', 'u_abc123');
      });

      expect(result.current.getCanonical('john.doe')).toBe('u_abc123');
      expect(result.current.getDisplay('u_abc123')).toBe('john.doe');
    });

    it('should increment version when registering new mapping', () => {
      const { result } = renderHook(() => useIdentityResolver());

      expect(result.current.version).toBe(0);

      act(() => {
        result.current.register('jane.doe', 'u_xyz789');
      });

      expect(result.current.version).toBe(1);
    });

    it('should not increment version when registering duplicate mapping', () => {
      const { result } = renderHook(() => useIdentityResolver());

      act(() => {
        result.current.register('john.doe', 'u_abc123');
      });

      const versionAfterFirst = result.current.version;

      act(() => {
        result.current.register('john.doe', 'u_abc123');
      });

      expect(result.current.version).toBe(versionAfterFirst);
    });

    it('should preserve first display value for canonical', () => {
      const { result } = renderHook(() => useIdentityResolver());

      act(() => {
        result.current.register('john.doe', 'u_abc123');
        result.current.register('john@elastic.co', 'u_abc123');
      });

      // First display value should be preserved.
      expect(result.current.getDisplay('u_abc123')).toBe('john.doe');
    });

    it('should support case-insensitive display lookups', () => {
      const { result } = renderHook(() => useIdentityResolver());

      act(() => {
        result.current.register('John.Doe', 'u_abc123');
      });

      expect(result.current.getCanonical('john.doe')).toBe('u_abc123');
      expect(result.current.getCanonical('JOHN.DOE')).toBe('u_abc123');
      expect(result.current.getCanonical('John.Doe')).toBe('u_abc123');
    });
  });

  describe('registerAll', () => {
    it('should register multiple mappings at once', () => {
      const { result } = renderHook(() => useIdentityResolver());

      act(() => {
        result.current.registerAll({
          'john.doe': 'u_abc123',
          'jane.doe': 'u_xyz789',
        });
      });

      expect(result.current.getCanonical('john.doe')).toBe('u_abc123');
      expect(result.current.getCanonical('jane.doe')).toBe('u_xyz789');
    });
  });

  describe('getCanonical', () => {
    it('should return canonical when value is a display value', () => {
      const { result } = renderHook(() => useIdentityResolver());

      act(() => {
        result.current.register('john.doe', 'u_abc123');
      });

      expect(result.current.getCanonical('john.doe')).toBe('u_abc123');
    });

    it('should return canonical when value is already canonical', () => {
      const { result } = renderHook(() => useIdentityResolver());

      act(() => {
        result.current.register('john.doe', 'u_abc123');
      });

      expect(result.current.getCanonical('u_abc123')).toBe('u_abc123');
    });

    it('should return input when value is unknown', () => {
      const { result } = renderHook(() => useIdentityResolver());

      expect(result.current.getCanonical('unknown')).toBe('unknown');
    });
  });

  describe('getDisplay', () => {
    it('should return display value for canonical', () => {
      const { result } = renderHook(() => useIdentityResolver());

      act(() => {
        result.current.register('john.doe', 'u_abc123');
      });

      expect(result.current.getDisplay('u_abc123')).toBe('john.doe');
    });

    it('should return input when value is already a display value', () => {
      const { result } = renderHook(() => useIdentityResolver());

      act(() => {
        result.current.register('john.doe', 'u_abc123');
      });

      // When given a display value, return it as-is.
      expect(result.current.getDisplay('john.doe')).toBe('john.doe');
    });

    it('should return input when value is unknown', () => {
      const { result } = renderHook(() => useIdentityResolver());

      expect(result.current.getDisplay('unknown')).toBe('unknown');
    });
  });

  describe('isSame', () => {
    it('should return true for identical values', () => {
      const { result } = renderHook(() => useIdentityResolver());

      expect(result.current.isSame('john.doe', 'john.doe')).toBe(true);
    });

    it('should return true for case-insensitive match', () => {
      const { result } = renderHook(() => useIdentityResolver());

      expect(result.current.isSame('John.Doe', 'john.doe')).toBe(true);
    });

    it('should return true when both resolve to same canonical', () => {
      const { result } = renderHook(() => useIdentityResolver());

      act(() => {
        result.current.register('john.doe', 'u_abc123');
        result.current.register('john@elastic.co', 'u_abc123');
      });

      expect(result.current.isSame('john.doe', 'john@elastic.co')).toBe(true);
      expect(result.current.isSame('john.doe', 'u_abc123')).toBe(true);
    });

    it('should return false when values resolve to different canonicals', () => {
      const { result } = renderHook(() => useIdentityResolver());

      act(() => {
        result.current.register('john.doe', 'u_abc123');
        result.current.register('jane.doe', 'u_xyz789');
      });

      expect(result.current.isSame('john.doe', 'jane.doe')).toBe(false);
    });

    it('should return false for unknown different values', () => {
      const { result } = renderHook(() => useIdentityResolver());

      expect(result.current.isSame('user1', 'user2')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all mappings', () => {
      const { result } = renderHook(() => useIdentityResolver());

      act(() => {
        result.current.register('john.doe', 'u_abc123');
        result.current.register('jane.doe', 'u_xyz789');
      });

      act(() => {
        result.current.clear();
      });

      expect(result.current.getCanonical('john.doe')).toBe('john.doe');
      expect(result.current.getDisplay('u_abc123')).toBe('u_abc123');
    });

    it('should increment version when clearing non-empty maps', () => {
      const { result } = renderHook(() => useIdentityResolver());

      act(() => {
        result.current.register('john.doe', 'u_abc123');
      });

      const versionBeforeClear = result.current.version;

      act(() => {
        result.current.clear();
      });

      expect(result.current.version).toBe(versionBeforeClear + 1);
    });

    it('should not increment version when clearing empty maps', () => {
      const { result } = renderHook(() => useIdentityResolver());

      const initialVersion = result.current.version;

      act(() => {
        result.current.clear();
      });

      expect(result.current.version).toBe(initialVersion);
    });
  });

  describe('memoization', () => {
    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => useIdentityResolver());

      const { getCanonical, getDisplay, isSame, register, registerAll, clear } = result.current;

      rerender();

      expect(result.current.getCanonical).toBe(getCanonical);
      expect(result.current.getDisplay).toBe(getDisplay);
      expect(result.current.isSame).toBe(isSame);
      expect(result.current.register).toBe(register);
      expect(result.current.registerAll).toBe(registerAll);
      expect(result.current.clear).toBe(clear);
    });
  });
});
