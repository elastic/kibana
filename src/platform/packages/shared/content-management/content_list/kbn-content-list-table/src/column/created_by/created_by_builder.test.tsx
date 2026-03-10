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
import { buildCreatedByColumn, type CreatedByColumnProps } from './created_by_builder';

/** The column returned by `buildCreatedByColumn` is always a field column with a render function. */
type CreatedByColumn = EuiTableFieldDataColumnType<ContentListItem>;

const defaultContext: ColumnBuilderContext = {
  itemConfig: undefined,
  isReadOnly: false,
  entityName: 'dashboard',
  supports: {
    sorting: true,
    pagination: false,
    search: false,
    selection: false,
    tags: false,
    createdBy: true,
  },
};

describe('created by column builder', () => {
  describe('buildCreatedByColumn', () => {
    it('returns a column with defaults when props are empty', () => {
      const result = buildCreatedByColumn({}, defaultContext);

      expect(result).toMatchObject({
        field: 'createdBy',
        name: 'Created by',
        sortable: false,
        'data-test-subj': 'content-list-table-column-createdBy',
      });
    });

    it('uses custom column title', () => {
      const props: CreatedByColumnProps = { columnTitle: 'Author' };
      const result = buildCreatedByColumn(props, defaultContext);

      expect(result).toMatchObject({ name: 'Author' });
    });

    it('applies custom width', () => {
      const props: CreatedByColumnProps = { width: '200px' };
      const result = buildCreatedByColumn(props, defaultContext);

      expect(result).toMatchObject({ width: '200px' });
    });

    it('does not include width when not specified', () => {
      const result = buildCreatedByColumn({}, defaultContext);
      expect(result).not.toHaveProperty('width');
    });

    it('defaults sortable to false', () => {
      const result = buildCreatedByColumn({}, defaultContext);
      expect(result).toMatchObject({ sortable: false });
    });

    it('respects sortable true when sorting is supported', () => {
      const props: CreatedByColumnProps = { sortable: true };
      const result = buildCreatedByColumn(props, defaultContext);

      expect(result).toMatchObject({ sortable: true });
    });

    it('forces sortable false when sorting is unsupported', () => {
      const context: ColumnBuilderContext = {
        ...defaultContext,
        supports: {
          sorting: false,
          pagination: false,
          search: false,
          selection: false,
          tags: false,
          createdBy: true,
        },
      };
      const props: CreatedByColumnProps = { sortable: true };

      const result = buildCreatedByColumn(props, context);

      expect(result).toMatchObject({ sortable: false });
    });

    it('provides a render function', () => {
      const result = buildCreatedByColumn({}, defaultContext) as CreatedByColumn;
      expect(result.render).toBeInstanceOf(Function);
    });

    it('render function returns a React element', () => {
      const result = buildCreatedByColumn({}, defaultContext) as CreatedByColumn;
      const item: ContentListItem = { id: '1', title: 'Test', createdBy: 'user-1' };
      const element = result.render?.('user-1', item);

      expect(React.isValidElement(element)).toBe(true);
    });

    it('passes entityName and entityNamePlural to CreatedByCell via render', () => {
      const context: ColumnBuilderContext = {
        ...defaultContext,
        entityName: 'visualization',
        entityNamePlural: 'visualizations',
      };
      const result = buildCreatedByColumn({}, context) as CreatedByColumn;
      const item: ContentListItem = { id: '1', title: 'Test', managed: true };
      const element = result.render?.('', item);

      expect(React.isValidElement(element)).toBe(true);
      expect((element as React.ReactElement).props).toMatchObject({
        entityName: 'visualization',
        entityNamePlural: 'visualizations',
      });
    });
  });
});
