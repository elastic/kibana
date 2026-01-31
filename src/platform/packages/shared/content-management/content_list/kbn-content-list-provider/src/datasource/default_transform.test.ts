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
  const createMockItem = (
    overrides?: Partial<UserContentCommonSchema>
  ): UserContentCommonSchema => ({
    id: 'test-id',
    type: 'dashboard',
    updatedAt: '2024-01-15T10:30:00.000Z',
    references: [],
    attributes: {
      title: 'Test Dashboard',
      description: 'A test dashboard description',
    },
    ...overrides,
  });

  describe('basic transformation', () => {
    it('transforms id correctly', () => {
      const item = createMockItem({ id: 'my-unique-id' });

      const result = defaultTransform(item);

      expect(result.id).toBe('my-unique-id');
    });

    it('transforms title from attributes', () => {
      const item = createMockItem({
        attributes: { title: 'My Dashboard Title', description: '' },
      });

      const result = defaultTransform(item);

      expect(result.title).toBe('My Dashboard Title');
    });

    it('transforms description from attributes', () => {
      const item = createMockItem({
        attributes: { title: 'Title', description: 'My detailed description' },
      });

      const result = defaultTransform(item);

      expect(result.description).toBe('My detailed description');
    });

    it('transforms type correctly', () => {
      const item = createMockItem({ type: 'visualization' });

      const result = defaultTransform(item);

      expect(result.type).toBe('visualization');
    });
  });

  describe('updatedAt handling', () => {
    it('transforms updatedAt string to Date object', () => {
      const item = createMockItem({ updatedAt: '2024-06-20T15:45:30.000Z' });

      const result = defaultTransform(item);

      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.updatedAt?.toISOString()).toBe('2024-06-20T15:45:30.000Z');
    });

    it('returns undefined for undefined updatedAt', () => {
      const item = createMockItem({ updatedAt: undefined });

      const result = defaultTransform(item);

      expect(result.updatedAt).toBeUndefined();
    });

    it('handles various ISO date formats', () => {
      const item = createMockItem({ updatedAt: '2024-01-01T00:00:00Z' });

      const result = defaultTransform(item);

      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.updatedAt?.getUTCFullYear()).toBe(2024);
    });
  });

  describe('edge cases', () => {
    it('handles empty description', () => {
      const item = createMockItem({
        attributes: { title: 'Title', description: '' },
      });

      const result = defaultTransform(item);

      expect(result.description).toBe('');
    });

    it('handles undefined description', () => {
      const item = createMockItem({
        attributes: { title: 'Title', description: undefined },
      });

      const result = defaultTransform(item);

      expect(result.description).toBeUndefined();
    });

    it('preserves special characters in title', () => {
      const item = createMockItem({
        attributes: { title: 'Dashboard <Test> & "Quotes"', description: '' },
      });

      const result = defaultTransform(item);

      expect(result.title).toBe('Dashboard <Test> & "Quotes"');
    });

    it('preserves unicode in title and description', () => {
      const item = createMockItem({
        attributes: { title: '仪表板 🎯', description: 'Описание' },
      });

      const result = defaultTransform(item);

      expect(result.title).toBe('仪表板 🎯');
      expect(result.description).toBe('Описание');
    });
  });

  describe('return type structure', () => {
    it('returns object with expected ContentListItem shape', () => {
      const item = createMockItem();

      const result = defaultTransform(item);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('updatedAt');
    });

    it('does not include extra properties from source item', () => {
      const item = createMockItem();

      const result = defaultTransform(item);

      expect(result).not.toHaveProperty('references');
      expect(result).not.toHaveProperty('attributes');
    });
  });

  describe('generic type support', () => {
    it('works with extended UserContentCommonSchema types', () => {
      interface ExtendedItem extends UserContentCommonSchema {
        customField: string;
      }

      const extendedItem: ExtendedItem = {
        ...createMockItem(),
        customField: 'custom value',
      };

      const result = defaultTransform(extendedItem);

      // Should still produce valid ContentListItem.
      expect(result.id).toBe('test-id');
      expect(result).not.toHaveProperty('customField');
    });
  });
});
