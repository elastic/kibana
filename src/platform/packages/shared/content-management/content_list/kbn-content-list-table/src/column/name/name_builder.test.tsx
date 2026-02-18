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
  supports: { sorting: true, pagination: true, search: false },
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

    it('applies custom width', () => {
      const props: NameColumnProps = { width: '50%' };
      const result = buildNameColumn(props, defaultContext);

      expect(result).toMatchObject({ width: '50%' });
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
        supports: { sorting: false, pagination: true, search: false },
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
  });
});
