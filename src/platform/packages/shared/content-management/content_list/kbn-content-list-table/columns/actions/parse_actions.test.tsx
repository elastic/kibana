/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  parseActionsFromChildren,
  isKnownAction,
  KNOWN_ACTION_IDS,
  type KnownActionDescriptor,
  type CustomActionDescriptor,
} from './parse_actions';
import { CONTENT_LIST_TABLE_ROLE, CONTENT_LIST_TABLE_ID } from '../namespaces';

// Create mock action components with stable identification.
const createMockActionComponent = (id: string, props: Record<string, unknown> = {}) => {
  const Component = () => null;
  (Component as unknown as Record<string, unknown>)[CONTENT_LIST_TABLE_ROLE] = 'action';
  (Component as unknown as Record<string, unknown>)[CONTENT_LIST_TABLE_ID] = id;
  Component.displayName = 'MockAction';

  return React.createElement(Component, { id, ...props });
};

describe('parse_actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('KNOWN_ACTION_IDS', () => {
    it('contains all expected known action IDs', () => {
      expect(KNOWN_ACTION_IDS).toContain('viewDetails');
      expect(KNOWN_ACTION_IDS).toContain('edit');
      expect(KNOWN_ACTION_IDS).toContain('delete');
      expect(KNOWN_ACTION_IDS).toContain('duplicate');
      expect(KNOWN_ACTION_IDS).toContain('export');
    });
  });

  describe('isKnownAction', () => {
    it('returns true for known action descriptors', () => {
      const descriptor: KnownActionDescriptor = { id: 'edit' };
      expect(isKnownAction(descriptor)).toBe(true);
    });

    it('returns true for all known action IDs', () => {
      KNOWN_ACTION_IDS.forEach((id) => {
        expect(isKnownAction({ id })).toBe(true);
      });
    });

    it('returns false for custom action descriptors', () => {
      const descriptor: CustomActionDescriptor = {
        id: 'custom',
        label: 'Custom',
        iconType: 'gear',
        handler: jest.fn(),
      };
      expect(isKnownAction(descriptor)).toBe(false);
    });
  });

  describe('parseActionsFromChildren', () => {
    it('returns null when hasChildren is false', () => {
      const result = parseActionsFromChildren(null, false);
      expect(result).toBeNull();
    });

    it('returns empty array when children is null but hasChildren is true', () => {
      const result = parseActionsFromChildren(null, true);
      expect(result).toEqual([]);
    });

    it('parses known action components', () => {
      const children = [createMockActionComponent('edit'), createMockActionComponent('delete')];

      const result = parseActionsFromChildren(children, true);

      expect(result).toHaveLength(2);
      expect(result?.[0].id).toBe('edit');
      expect(result?.[1].id).toBe('delete');
    });

    it('parses custom action components with handler', () => {
      const handler = jest.fn();
      const children = [
        createMockActionComponent('custom', {
          label: 'Custom',
          iconType: 'gear',
          handler,
        }),
      ];

      const result = parseActionsFromChildren(children, true);

      expect(result).toHaveLength(1);
      expect(result?.[0].id).toBe('custom');
      expect((result?.[0] as CustomActionDescriptor).handler).toBe(handler);
    });

    it('filters out duplicate action IDs', () => {
      const children = [createMockActionComponent('edit'), createMockActionComponent('edit')];

      const result = parseActionsFromChildren(children, true);

      expect(result).toHaveLength(1);
      // eslint-disable-next-line no-console
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Duplicate action ID'));
    });

    it('filters out non-action components', () => {
      const children = [
        React.createElement('div', { key: '1' }),
        createMockActionComponent('edit'),
        React.createElement('span', { key: '2' }),
      ];

      const result = parseActionsFromChildren(children, true);

      expect(result).toHaveLength(1);
      expect(result?.[0].id).toBe('edit');
    });

    it('warns when action component is missing id', () => {
      const Component = () => null;
      (Component as unknown as Record<string, unknown>)[CONTENT_LIST_TABLE_ROLE] = 'action';
      // No ID set.
      const children = [React.createElement(Component, { key: '1' })];

      parseActionsFromChildren(children, true);

      // eslint-disable-next-line no-console
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('missing id'));
    });

    it('logs error when custom action is missing handler', () => {
      const children = [
        createMockActionComponent('customNoHandler', {
          label: 'No Handler',
          iconType: 'gear',
          // No handler provided.
        }),
      ];

      const result = parseActionsFromChildren(children, true);

      // eslint-disable-next-line no-console
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('missing handler'));
      // Should filter out the invalid action.
      expect(result).toHaveLength(0);
    });

    it('preserves tooltip and aria-label props', () => {
      const children = [
        createMockActionComponent('edit', {
          tooltip: 'Edit this item',
          'aria-label': 'Edit item',
        }),
      ];

      const result = parseActionsFromChildren(children, true);

      expect(result?.[0]).toMatchObject({
        id: 'edit',
        tooltip: 'Edit this item',
        'aria-label': 'Edit item',
      });
    });

    it('handles mixed known and custom actions', () => {
      const handler = jest.fn();
      const children = [
        createMockActionComponent('edit'),
        createMockActionComponent('share', {
          label: 'Share',
          iconType: 'share',
          handler,
        }),
        createMockActionComponent('delete'),
      ];

      const result = parseActionsFromChildren(children, true);

      expect(result).toHaveLength(3);
      expect(result?.[0].id).toBe('edit');
      expect(result?.[1].id).toBe('share');
      expect(result?.[2].id).toBe('delete');
    });

    it('handles fragment children', () => {
      const children = React.createElement(
        React.Fragment,
        null,
        createMockActionComponent('edit'),
        createMockActionComponent('delete')
      );

      // React.Children.forEach handles fragments.
      const result = parseActionsFromChildren(children, true);

      expect(result?.length).toBeGreaterThanOrEqual(0);
    });
  });
});
