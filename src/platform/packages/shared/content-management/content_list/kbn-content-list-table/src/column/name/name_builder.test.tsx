/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { ColumnBuilderContext } from '../types';
import { buildNameColumn, type NameColumnProps } from './name_builder';

/** The column returned by `buildNameColumn` is always a field column with a render function. */
type NameColumn = EuiTableFieldDataColumnType<ContentListItem>;

const defaultContext: ColumnBuilderContext = {
  itemConfig: undefined,
  isReadOnly: false,
  entityName: 'dashboard',
  supports: {
    sorting: true,
    pagination: true,
    search: false,
    selection: true,
    tags: false,
    starred: false,
    userProfiles: false,
  },
};

describe('name column builder', () => {
  describe('buildNameColumn', () => {
    it('returns a column with defaults when props are empty', () => {
      const result = buildNameColumn({}, defaultContext);

      expect(result).toMatchObject({
        field: 'title',
        name: 'Name',
        sortable: true,
        'data-test-subj': 'content-list-table-column-name',
      });
    });

    it('uses custom column title', () => {
      const props: NameColumnProps = { columnTitle: 'Dashboard Name' };
      const result = buildNameColumn(props, defaultContext);

      expect(result).toMatchObject({ name: 'Dashboard Name' });
    });

    it('applies custom layout props', () => {
      const props: NameColumnProps = {
        width: '32em',
        minWidth: '24em',
        maxWidth: '64em',
        truncateText: { lines: 4 },
      };
      const result = buildNameColumn(props, defaultContext);

      expect(result).toMatchObject({
        width: '32em',
        minWidth: '24em',
        maxWidth: '64em',
        truncateText: { lines: 4 },
      });
    });

    it('does not include width when not specified', () => {
      const result = buildNameColumn({}, defaultContext);
      expect(result).not.toHaveProperty('width');
    });

    it('respects sortable false', () => {
      const props: NameColumnProps = { sortable: false };
      const result = buildNameColumn(props, defaultContext);

      expect(result).toMatchObject({ sortable: false });
    });

    it('forces sortable false when sorting is unsupported', () => {
      const context: ColumnBuilderContext = {
        ...defaultContext,
        supports: {
          sorting: false,
          pagination: true,
          search: false,
          selection: true,
          tags: false,
          starred: false,
          userProfiles: false,
        },
      };

      const result = buildNameColumn({}, context);

      expect(result).toMatchObject({ sortable: false });
    });

    it('provides a render function', () => {
      const result = buildNameColumn({}, defaultContext) as NameColumn;
      expect(result.render).toBeInstanceOf(Function);
    });

    it('uses custom render function when provided', () => {
      const customRender = jest.fn(() => React.createElement('span', null, 'Custom'));
      const props: NameColumnProps = { render: customRender };
      const result = buildNameColumn(props, defaultContext) as NameColumn;

      const item = { id: '1', title: 'Test' };
      result.render?.('Test', item);
      expect(customRender).toHaveBeenCalledWith(item);
    });

    it('passes title click handlers through to the rendered name cell', () => {
      const handleClick = jest.fn();
      const props: NameColumnProps = { onClick: handleClick, shouldUseHref: true };
      const result = buildNameColumn(props, defaultContext) as NameColumn;

      const item = { id: '1', title: 'Test' };
      const rendered = result.render?.('Test', item) as React.ReactElement;

      expect(rendered.props).toMatchObject({ onClick: handleClick, shouldUseHref: true });
    });
  });

  describe('showTags auto-enable', () => {
    it('auto-enables showTags when supports.tags is true', () => {
      const context: ColumnBuilderContext = {
        ...defaultContext,
        supports: { ...defaultContext.supports!, tags: true },
      };
      const result = buildNameColumn({}, context) as NameColumn;

      const item = { id: '1', title: 'Test', tags: ['tag-1'] };
      const rendered = result.render?.('Test', item) as React.ReactElement;
      expect(rendered.props).toMatchObject({ showTags: true });
    });

    it('does not show tags when supports.tags is false', () => {
      const result = buildNameColumn({}, defaultContext) as NameColumn;
      // supports.tags is false in defaultContext — showTags defaults to false.
      const item = { id: '1', title: 'Test', tags: ['tag-1'] };
      const rendered = result.render?.('Test', item) as React.ReactElement;
      expect(rendered.props).toMatchObject({ showTags: false });
    });

    it('respects explicit showTags=false even when supports.tags is true', () => {
      const context: ColumnBuilderContext = {
        ...defaultContext,
        supports: { ...defaultContext.supports!, tags: true },
      };
      const props: NameColumnProps = { showTags: false };
      const result = buildNameColumn(props, context) as NameColumn;

      const item = { id: '1', title: 'Test', tags: ['tag-1'] };
      const rendered = result.render?.('Test', item) as React.ReactElement;
      expect(rendered.props).toMatchObject({ showTags: false });
    });
  });
});
