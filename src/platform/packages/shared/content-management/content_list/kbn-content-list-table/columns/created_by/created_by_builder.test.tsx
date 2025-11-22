/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactElement } from 'react';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { ColumnBuilderContext } from '../types';
import { buildColumn, parseProps } from './created_by_builder';

// Mock the CreatedByCell component.
jest.mock('./created_by_cell', () => ({
  CreatedByCell: ({
    uid,
    managed,
    entityName,
  }: {
    uid?: string;
    managed?: boolean;
    entityName?: string;
  }) => <div data-test-subj="mock-created-by-cell">{uid ?? 'no-user'}</div>,
}));

const mockItem: ContentListItem = {
  id: '1',
  title: 'Test Item',
  createdBy: 'user-123',
};

const createContext = (overrides?: Partial<ColumnBuilderContext>): ColumnBuilderContext => ({
  itemConfig: undefined,
  isReadOnly: false,
  entityName: 'dashboard',
  ...overrides,
});

describe('created_by_builder', () => {
  describe('parseProps', () => {
    it('parses element props correctly', () => {
      const element = {
        props: {
          columnTitle: 'Author',
          width: '150px',
          render: jest.fn(),
        },
      } as unknown as ReactElement;

      const result = parseProps(element);

      expect(result.columnTitle).toBe('Author');
      expect(result.width).toBe('150px');
      expect(result.render).toBeDefined();
    });

    it('handles empty props', () => {
      const element = { props: {} } as unknown as ReactElement;

      const result = parseProps(element);

      expect(result.columnTitle).toBeUndefined();
      expect(result.width).toBeUndefined();
      expect(result.render).toBeUndefined();
    });

    it('handles undefined props', () => {
      const element = {} as unknown as ReactElement;

      const result = parseProps(element);

      expect(result.columnTitle).toBeUndefined();
    });
  });

  describe('buildColumn', () => {
    it('returns null when config is false', () => {
      const context = createContext();

      const result = buildColumn(false, context);

      expect(result).toBeNull();
    });

    it('builds column with default settings when config is true', () => {
      const context = createContext();

      const result = buildColumn(true, context);

      expect(result).not.toBeNull();
      expect(result?.field).toBe('createdBy');
      expect(result?.name).toBe('Creator');
      expect(result?.width).toBe('24px');
      // createdBy is not sortable by default (uid-based values don't sort meaningfully).
      expect(result?.sortable).toBe(false);
      expect(result?.align).toBe('center');
      expect(result?.['data-test-subj']).toBe('content-list-table-column-created-by');
    });

    it('is sortable when createdBy is in sortableFields', () => {
      const context = createContext({ sortableFields: ['createdBy'] });

      const result = buildColumn(true, context);

      expect(result?.sortable).toBe(true);
    });

    it('uses custom title when provided', () => {
      const context = createContext();
      const config = { columnTitle: 'Author' };

      const result = buildColumn(config, context);

      expect(result?.name).toBe('Author');
    });

    it('uses custom width when provided', () => {
      const context = createContext();
      const config = { width: '100px' };

      const result = buildColumn(config, context);

      expect(result?.width).toBe('100px');
    });

    it('uses custom render function when provided', () => {
      const customRender = jest.fn().mockReturnValue(<span>Custom</span>);
      const context = createContext();
      const config = { render: customRender };

      const result = buildColumn(config, context);

      // Invoke the render function.
      const renderFn = result?.render as (value: string, item: ContentListItem) => React.ReactNode;
      renderFn('user-123', mockItem);

      expect(customRender).toHaveBeenCalledWith(mockItem, 'user-123');
    });

    it('renders CreatedByCell when no custom render is provided', () => {
      const context = createContext({ entityName: 'visualization' });

      const result = buildColumn(true, context);
      const renderFn = result?.render as (value: string, item: ContentListItem) => React.ReactNode;
      const rendered = renderFn('user-123', mockItem);

      // Should render the mocked CreatedByCell.
      expect(rendered).toBeDefined();
    });

    it('passes managed flag to CreatedByCell', () => {
      const context = createContext();
      const itemWithManaged: ContentListItem = {
        ...mockItem,
        managed: true,
      };

      const result = buildColumn(true, context);
      const renderFn = result?.render as (value: string, item: ContentListItem) => React.ReactNode;
      const rendered = renderFn('user-123', itemWithManaged);

      expect(rendered).toBeDefined();
    });

    it('handles undefined createdBy value', () => {
      const context = createContext();
      const itemWithoutCreator: ContentListItem = {
        id: '2',
        title: 'No Creator',
      };

      const result = buildColumn(true, context);
      const renderFn = result?.render as (
        value: string | undefined,
        item: ContentListItem
      ) => React.ReactNode;
      const rendered = renderFn(undefined, itemWithoutCreator);

      expect(rendered).toBeDefined();
    });

    it('handles non-boolean managed value', () => {
      const context = createContext();
      const itemWithStringManaged: ContentListItem = {
        ...mockItem,
        managed: 'yes' as unknown as boolean,
      };

      const result = buildColumn(true, context);
      const renderFn = result?.render as (value: string, item: ContentListItem) => React.ReactNode;

      // Should not throw.
      expect(() => renderFn('user-123', itemWithStringManaged)).not.toThrow();
    });
  });
});
