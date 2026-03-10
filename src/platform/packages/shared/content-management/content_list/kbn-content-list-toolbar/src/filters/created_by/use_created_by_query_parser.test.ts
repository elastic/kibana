/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useCreatedByQueryParser } from './use_created_by_query_parser';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseContentListUserFilter = jest.fn();
jest.mock('@kbn/content-list-provider', () => ({
  useContentListUserFilter: () => mockUseContentListUserFilter(),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCreatedByQueryParser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns `null` when createdBy is not supported.', () => {
    mockUseContentListUserFilter.mockReturnValue({
      isSupported: false,
      selectedUsers: [],
      setSelectedUsers: jest.fn(),
      hasActiveFilter: false,
    });

    const { result } = renderHook(() => useCreatedByQueryParser());
    expect(result.current).toBeNull();
  });

  it('returns a parser when createdBy is supported.', () => {
    mockUseContentListUserFilter.mockReturnValue({
      isSupported: true,
      selectedUsers: [],
      setSelectedUsers: jest.fn(),
      hasActiveFilter: false,
    });

    const { result } = renderHook(() => useCreatedByQueryParser());
    expect(result.current).not.toBeNull();
    expect(typeof result.current?.parse).toBe('function');
  });

  describe('parse', () => {
    beforeEach(() => {
      mockUseContentListUserFilter.mockReturnValue({
        isSupported: true,
        selectedUsers: [],
        setSelectedUsers: jest.fn(),
        hasActiveFilter: false,
      });
    });

    it('passes through query text with no `createdBy` clauses unchanged.', () => {
      const { result } = renderHook(() => useCreatedByQueryParser());
      const parser = result.current!;

      const output = parser.parse('hello world');
      expect(output.searchQuery).toBe('hello world');
      expect(output.filters).toEqual({});
    });

    it('strips a single `createdBy:value` clause from the query text.', () => {
      const { result } = renderHook(() => useCreatedByQueryParser());
      const parser = result.current!;

      const output = parser.parse('hello createdBy:jane@elastic.co world');
      expect(output.searchQuery).not.toContain('createdBy');
      expect(output.searchQuery).toContain('hello');
      expect(output.searchQuery).toContain('world');
      expect(output.filters).toEqual({});
    });

    it('strips a quoted `createdBy:"value"` clause from the query text.', () => {
      const { result } = renderHook(() => useCreatedByQueryParser());
      const parser = result.current!;

      const output = parser.parse('createdBy:"Jane Doe" dashboard');
      expect(output.searchQuery).not.toContain('createdBy');
      expect(output.searchQuery).not.toContain('Jane Doe');
      expect(output.searchQuery).toContain('dashboard');
      expect(output.filters).toEqual({});
    });

    it('strips multiple `createdBy` values in OR syntax.', () => {
      const { result } = renderHook(() => useCreatedByQueryParser());
      const parser = result.current!;

      const output = parser.parse('createdBy:(jane@elastic.co OR bob@elastic.co)');
      expect(output.searchQuery).not.toContain('createdBy');
      expect(output.searchQuery).not.toContain('jane@elastic.co');
      expect(output.searchQuery).not.toContain('bob@elastic.co');
      expect(output.filters).toEqual({});
    });

    it('strips `managed` and `none` sentinel values.', () => {
      const { result } = renderHook(() => useCreatedByQueryParser());
      const parser = result.current!;

      const output = parser.parse('createdBy:(managed OR none) search text');
      expect(output.searchQuery).not.toContain('createdBy');
      expect(output.searchQuery).not.toContain('managed');
      expect(output.searchQuery).not.toContain('none');
      expect(output.searchQuery).toContain('search text');
      expect(output.filters).toEqual({});
    });

    it('handles unparseable query text gracefully.', () => {
      const { result } = renderHook(() => useCreatedByQueryParser());
      const parser = result.current!;

      const output = parser.parse('createdBy:');
      expect(output.searchQuery).toBe('createdBy:');
      expect(output.filters).toEqual({});
    });
  });
});
