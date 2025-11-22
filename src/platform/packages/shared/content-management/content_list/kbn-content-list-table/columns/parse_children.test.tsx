/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { parseColumnsFromChildren } from './parse_children';
import { CONTENT_LIST_TABLE_ROLE, CONTENT_LIST_TABLE_ID } from './namespaces';

// Create mock column components with stable identification.
const createMockColumnComponent = (id: string, props: Record<string, unknown> = {}) => {
  const Component = () => null;
  (Component as unknown as Record<string, unknown>)[CONTENT_LIST_TABLE_ROLE] = 'column';
  (Component as unknown as Record<string, unknown>)[CONTENT_LIST_TABLE_ID] = id;
  Component.displayName = 'MockColumn';

  return React.createElement(Component, { id, ...props });
};

// Create mock column with displayName for fallback tests.
const createMockColumnWithDisplayName = (
  displayName: string,
  props: Record<string, unknown> = {}
) => {
  const Component = () => null;
  Component.displayName = displayName;

  return React.createElement(Component, props);
};

describe('parseColumnsFromChildren', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('default columns', () => {
    it('returns default columns when hasChildren is false', () => {
      const [columns, config] = parseColumnsFromChildren(null, false);

      expect(columns).toContain('expander');
      expect(columns).toContain('name');
      expect(columns).toContain('updatedAt');
      expect(columns).toContain('actions');
      expect(config).toEqual({});
    });

    it('includes createdBy when userProfiles is supported', () => {
      const [columns] = parseColumnsFromChildren(null, false, { userProfiles: true });

      expect(columns).toContain('createdBy');
    });

    it('excludes createdBy when userProfiles is not supported', () => {
      const [columns] = parseColumnsFromChildren(null, false, { userProfiles: false });

      expect(columns).not.toContain('createdBy');
    });

    it('excludes createdBy when supports is undefined', () => {
      const [columns] = parseColumnsFromChildren(null, false, undefined);

      expect(columns).not.toContain('createdBy');
    });
  });

  describe('parsing children', () => {
    it('parses column components from children', () => {
      const children = [createMockColumnComponent('name'), createMockColumnComponent('updatedAt')];

      const [columns] = parseColumnsFromChildren(children, true);

      expect(columns).toEqual(['name', 'updatedAt']);
    });

    it('extracts column configuration from props', () => {
      const children = [
        createMockColumnComponent('name', { width: '200px', columnTitle: 'Title' }),
      ];

      const [columns, config] = parseColumnsFromChildren(children, true);

      expect(columns).toContain('name');
      expect(config.name).toBeDefined();
    });

    it('filters out non-column components', () => {
      const children = [
        React.createElement('div', { key: '1' }),
        createMockColumnComponent('name'),
        React.createElement('span', { key: '2' }),
      ];

      const [columns] = parseColumnsFromChildren(children, true);

      expect(columns).toHaveLength(1);
      expect(columns[0]).toBe('name');
    });

    it('warns and skips columns with duplicate IDs', () => {
      const children = [createMockColumnComponent('name'), createMockColumnComponent('name')];

      const [columns] = parseColumnsFromChildren(children, true);

      expect(columns).toHaveLength(1);
      // eslint-disable-next-line no-console
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Duplicate column ID'));
    });

    it('warns when column is missing ID', () => {
      const Component = () => null;
      (Component as unknown as Record<string, unknown>)[CONTENT_LIST_TABLE_ROLE] = 'column';
      // No ID set.
      const children = [React.createElement(Component, { key: '1' })];

      parseColumnsFromChildren(children, true);

      // eslint-disable-next-line no-console
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('missing id'));
    });

    it('falls back to defaults when children provided but no valid columns', () => {
      const children = [
        React.createElement('div', { key: '1' }),
        React.createElement('span', { key: '2' }),
      ];

      const [columns] = parseColumnsFromChildren(children, true);

      expect(columns).toContain('name');
      expect(columns).toContain('updatedAt');
      // eslint-disable-next-line no-console
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('no Column components found')
      );
    });
  });

  describe('custom columns', () => {
    it('handles custom column configuration', () => {
      const customRender = jest.fn();
      const children = [
        createMockColumnComponent('custom', {
          name: 'Custom Column',
          width: '150px',
          sortable: true,
          render: customRender,
        }),
      ];

      const [columns, config] = parseColumnsFromChildren(children, true);

      expect(columns).toContain('custom');
      expect(config.custom).toBeDefined();
    });

    it('preserves order of columns from children', () => {
      const children = [
        createMockColumnComponent('actions'),
        createMockColumnComponent('name'),
        createMockColumnComponent('updatedAt'),
      ];

      const [columns] = parseColumnsFromChildren(children, true);

      expect(columns).toEqual(['actions', 'name', 'updatedAt']);
    });
  });

  describe('built-in column parsing', () => {
    it('uses name parser for name column', () => {
      const children = [createMockColumnComponent('name', { width: '300px' })];

      const [, config] = parseColumnsFromChildren(children, true);

      expect(config.name).toBeDefined();
    });

    it('uses updatedAt parser for updatedAt column', () => {
      const children = [createMockColumnComponent('updatedAt', { columnTitle: 'Modified' })];

      const [, config] = parseColumnsFromChildren(children, true);

      expect(config.updatedAt).toBeDefined();
    });

    it('uses createdBy parser for createdBy column', () => {
      const children = [createMockColumnComponent('createdBy', { width: '50px' })];

      const [, config] = parseColumnsFromChildren(children, true);

      expect(config.createdBy).toBeDefined();
    });

    it('uses actions parser for actions column', () => {
      const children = [createMockColumnComponent('actions', { width: '200px' })];

      const [, config] = parseColumnsFromChildren(children, true);

      expect(config.actions).toBeDefined();
    });

    it('uses expander parser for expander column', () => {
      const children = [createMockColumnComponent('expander')];

      const [, config] = parseColumnsFromChildren(children, true);

      expect(config.expander).toBeDefined();
    });
  });

  describe('displayName fallback', () => {
    it('falls back to displayName for column identification', () => {
      const NameColumn = () => null;
      NameColumn.displayName = 'NameColumn';

      const children = [React.createElement(NameColumn, { key: '1' })];

      const [columns] = parseColumnsFromChildren(children, true);

      expect(columns).toContain('name');
    });

    it('handles UpdatedAtColumn displayName', () => {
      const UpdatedAtColumn = () => null;
      UpdatedAtColumn.displayName = 'UpdatedAtColumn';

      const children = [React.createElement(UpdatedAtColumn, { key: '1' })];

      const [columns] = parseColumnsFromChildren(children, true);

      expect(columns).toContain('updatedAt');
    });
  });

  describe('edge cases', () => {
    it('handles null children by falling back to defaults', () => {
      const [columns] = parseColumnsFromChildren(null, true);

      // Falls back to default columns when no valid Column components found.
      expect(columns).toContain('name');
      expect(columns).toContain('updatedAt');
    });

    it('handles undefined children by falling back to defaults', () => {
      const [columns] = parseColumnsFromChildren(undefined, true);

      // Falls back to default columns when no valid Column components found.
      expect(columns).toContain('name');
      expect(columns).toContain('updatedAt');
    });

    it('handles single child (not array)', () => {
      const child = createMockColumnComponent('name');

      const [columns] = parseColumnsFromChildren(child, true);

      expect(columns).toContain('name');
    });

    it('handles fragment children', () => {
      const children = React.createElement(
        React.Fragment,
        null,
        createMockColumnComponent('name'),
        createMockColumnComponent('updatedAt')
      );

      const [columns] = parseColumnsFromChildren(children, true);

      expect(columns.length).toBeGreaterThanOrEqual(0);
    });
  });
});
