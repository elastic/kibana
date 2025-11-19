/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import { defaultTransform } from './default_transform';

describe('defaultTransform', () => {
  it('should transform basic UserContentCommonSchema to ContentListItem', () => {
    const input: UserContentCommonSchema = {
      id: 'test-id-1',
      type: 'dashboard',
      attributes: {
        title: 'Test Dashboard',
        description: 'Test description',
      },
      updatedAt: '2024-01-15T10:30:00Z',
      createdAt: '2024-01-01T08:00:00Z',
      updatedBy: 'user-1',
      createdBy: 'user-0',
      references: [],
      managed: false,
    };

    const result = defaultTransform(input);

    expect(result.id).toBe('test-id-1');
    expect(result.title).toBe('Test Dashboard');
    expect(result.description).toBe('Test description');
    expect(result.type).toBe('dashboard');
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.updatedAt?.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.createdAt?.toISOString()).toBe('2024-01-01T08:00:00.000Z');
    expect(result.updatedBy).toBe('user-1');
    expect(result.createdBy).toBe('user-0');
    expect(result.isManaged).toBe(false);
    expect(result.canStar).toBeUndefined(); // undefined = use provider default
  });

  it('should handle missing optional fields', () => {
    const input: UserContentCommonSchema = {
      id: 'test-id-2',
      type: 'visualization',
      attributes: {
        title: 'Test Viz',
      },
      updatedAt: '2024-01-15T10:30:00Z',
      references: [],
      managed: false,
    };

    const result = defaultTransform(input);

    expect(result.id).toBe('test-id-2');
    expect(result.title).toBe('Test Viz');
    expect(result.description).toBeUndefined();
    expect(result.createdAt).toBeUndefined();
    expect(result.createdBy).toBeUndefined();
    expect(result.updatedBy).toBeUndefined();
  });

  it('should extract tag IDs from references', () => {
    const input: UserContentCommonSchema = {
      id: 'test-id-3',
      type: 'dashboard',
      attributes: {
        title: 'Tagged Dashboard',
      },
      updatedAt: '2024-01-15T10:30:00Z',
      references: [
        { type: 'tag', id: 'tag-1', name: 'tag-ref-1' },
        { type: 'index-pattern', id: 'pattern-1', name: 'pattern-ref-1' },
        { type: 'tag', id: 'tag-2', name: 'tag-ref-2' },
      ],
      managed: false,
    };

    const result = defaultTransform(input);

    expect(result.tags).toEqual(['tag-1', 'tag-2']);
    expect(result.references).toHaveLength(3); // Preserves full references
  });

  it('should handle items with no tag references', () => {
    const input: UserContentCommonSchema = {
      id: 'test-id-4',
      type: 'dashboard',
      attributes: {
        title: 'Untagged Dashboard',
      },
      updatedAt: '2024-01-15T10:30:00Z',
      references: [
        { type: 'index-pattern', id: 'pattern-1', name: 'pattern-ref-1' },
        { type: 'visualization', id: 'viz-1', name: 'viz-ref-1' },
      ],
      managed: false,
    };

    const result = defaultTransform(input);

    expect(result.tags).toEqual([]);
    expect(result.references).toHaveLength(2);
  });

  it('should handle items with empty references array', () => {
    const input: UserContentCommonSchema = {
      id: 'test-id-5',
      type: 'dashboard',
      attributes: {
        title: 'No References Dashboard',
      },
      updatedAt: '2024-01-15T10:30:00Z',
      references: [],
      managed: false,
    };

    const result = defaultTransform(input);

    expect(result.tags).toEqual([]);
    expect(result.references).toEqual([]);
  });

  it('should convert date strings to Date objects', () => {
    const input: UserContentCommonSchema = {
      id: 'test-id-6',
      type: 'dashboard',
      attributes: {
        title: 'Date Test',
      },
      updatedAt: '2024-03-20T15:45:30.123Z',
      createdAt: '2024-01-10T09:00:00.000Z',
      references: [],
      managed: false,
    };

    const result = defaultTransform(input);

    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt?.getFullYear()).toBe(2024);
    expect(result.updatedAt?.getMonth()).toBe(2); // March (0-indexed)
    expect(result.createdAt?.getMonth()).toBe(0); // January
  });

  it('should handle undefined date fields', () => {
    const input: UserContentCommonSchema = {
      id: 'test-id-7',
      type: 'dashboard',
      attributes: {
        title: 'No Dates Dashboard',
      },
      updatedAt: '2024-01-15T10:30:00Z',
      references: [],
      managed: false,
    };

    const result = defaultTransform(input);

    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.createdAt).toBeUndefined();
  });

  it('should handle empty string updatedAt', () => {
    const input: UserContentCommonSchema = {
      id: 'test-id-13',
      type: 'dashboard',
      attributes: {
        title: 'Empty UpdatedAt Dashboard',
      },
      updatedAt: '',
      references: [],
      managed: false,
    };

    const result = defaultTransform(input);

    // Empty string is falsy, so updatedAt should be undefined
    expect(result.updatedAt).toBeUndefined();
  });

  it('should preserve extra fields from input', () => {
    const input = {
      id: 'test-id-8',
      type: 'dashboard',
      attributes: {
        title: 'Extra Fields Dashboard',
      },
      updatedAt: '2024-01-15T10:30:00Z',
      references: [],
      managed: true,
      customField: 'custom-value',
      anotherField: 123,
    } as UserContentCommonSchema & { customField: string; anotherField: number };

    const result = defaultTransform(input);

    expect(result.customField).toBe('custom-value');
    expect(result.anotherField).toBe(123);
  });

  it('should handle managed flag', () => {
    const managedInput: UserContentCommonSchema = {
      id: 'test-id-9',
      type: 'dashboard',
      attributes: {
        title: 'Managed Dashboard',
      },
      updatedAt: '2024-01-15T10:30:00Z',
      references: [],
      managed: true,
    };

    const unmanagedInput: UserContentCommonSchema = {
      ...managedInput,
      id: 'test-id-10',
      managed: false,
    };

    const managedResult = defaultTransform(managedInput);
    const unmanagedResult = defaultTransform(unmanagedInput);

    expect(managedResult.isManaged).toBe(true);
    expect(unmanagedResult.isManaged).toBe(false);
  });

  it('should handle undefined managed flag', () => {
    const input: UserContentCommonSchema = {
      id: 'test-id-11',
      type: 'dashboard',
      attributes: {
        title: 'No Managed Flag Dashboard',
      },
      updatedAt: '2024-01-15T10:30:00Z',
      references: [],
      managed: false,
    };

    const result = defaultTransform(input);

    expect(result.isManaged).toBe(false);
  });

  it('should set canStar to undefined for non-managed items (opt-out model)', () => {
    const input: UserContentCommonSchema = {
      id: 'test-id-starred',
      type: 'dashboard',
      attributes: {
        title: 'Starrable Dashboard',
      },
      updatedAt: '2024-01-15T10:30:00Z',
      references: [],
      managed: false,
    };

    const result = defaultTransform(input);

    // undefined means "use provider default" - show starred if provider supports it
    expect(result.canStar).toBeUndefined();
  });

  it('should set canStar to false for managed items', () => {
    const input: UserContentCommonSchema = {
      id: 'test-id-managed',
      type: 'dashboard',
      attributes: {
        title: 'Managed Dashboard',
      },
      updatedAt: '2024-01-15T10:30:00Z',
      references: [],
      managed: true,
    };

    const result = defaultTransform(input);

    // Managed items explicitly cannot be starred.
    expect(result.canStar).toBe(false);
  });

  it('should preserve references array intact', () => {
    const references = [
      { type: 'tag', id: 'tag-1', name: 'tag-ref-1' },
      { type: 'index-pattern', id: 'pattern-1', name: 'pattern-ref-1' },
      { type: 'visualization', id: 'viz-1', name: 'viz-ref-1' },
    ];

    const input: UserContentCommonSchema = {
      id: 'test-id-12',
      type: 'dashboard',
      attributes: {
        title: 'References Test',
      },
      updatedAt: '2024-01-15T10:30:00Z',
      references,
      managed: false,
    };

    const result = defaultTransform(input);

    expect(result.references).toEqual(references);
    expect(result.references).toBe(references); // Should be same reference (not copied)
  });
});
