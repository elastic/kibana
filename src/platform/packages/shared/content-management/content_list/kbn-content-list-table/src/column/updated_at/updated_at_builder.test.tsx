/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import { I18nProvider } from '@kbn/i18n-react';
import type { ColumnBuilderContext } from '../types';
import { buildUpdatedAtColumn, type UpdatedAtColumnProps } from './updated_at_builder';

/** The column returned by `buildUpdatedAtColumn` is always a field column with a render function. */
type UpdatedAtColumn = EuiTableFieldDataColumnType<ContentListItem>;

const defaultContext: ColumnBuilderContext = {
  itemConfig: undefined,
  isReadOnly: false,
  entityName: 'dashboard',
  supports: {
    sorting: true,
    pagination: true,
    search: true,
    selection: true,
    tags: false,
    starred: false,
    userProfiles: false,
  },
};

describe('updated at column builder', () => {
  describe('buildUpdatedAtColumn', () => {
    it('returns a column with defaults when props are empty', () => {
      const result = buildUpdatedAtColumn({}, defaultContext);

      expect(result).toMatchObject({
        field: 'updatedAt',
        name: 'Last updated',
        sortable: true,
        'data-test-subj': 'content-list-table-column-updatedAt',
      });
    });

    it('uses custom column title', () => {
      const props: UpdatedAtColumnProps = { columnTitle: 'Modified' };
      const result = buildUpdatedAtColumn(props, defaultContext);

      expect(result).toMatchObject({ name: 'Modified' });
    });

    it('applies the documented width / minWidth / maxWidth defaults when no props supplied', () => {
      const result = buildUpdatedAtColumn({}, defaultContext);

      expect(result).toMatchObject({
        width: '9.5em',
        // `'max-content'` floor lets the translated header expand the column
        // past `width` in long-text locales (e.g. de "Letzte Aktualisierung").
        minWidth: 'max-content',
        // Pinned to `width` so the column never absorbs slack on full-width
        // pages — that whitespace lives inside the table after `Column.Name`.
        maxWidth: '9.5em',
      });
    });

    it('lets consumer-supplied layout props win over defaults', () => {
      const props: UpdatedAtColumnProps = {
        width: '12em',
        minWidth: '10em',
        maxWidth: '14em',
        truncateText: false,
      };
      const result = buildUpdatedAtColumn(props, defaultContext);

      expect(result).toMatchObject({
        width: '12em',
        minWidth: '10em',
        maxWidth: '14em',
        truncateText: false,
      });
    });

    it('falls back maxWidth to the consumer-supplied width when only width is overridden', () => {
      const result = buildUpdatedAtColumn({ width: '14em' }, defaultContext);

      expect(result).toMatchObject({
        width: '14em',
        minWidth: 'max-content',
        maxWidth: '14em',
      });
    });

    it('treats explicit `undefined` as an opt-out — clears the cap so the column can absorb slack', () => {
      // `<Column.UpdatedAt maxWidth={undefined} />` should render with the
      // preset `width` (`9.5em`) and `minWidth` (`'max-content'`) defaults
      // intact, but no `max-width` style — the column is free to grow on
      // wide viewports. Distinct from omitting the prop, which falls back
      // to `maxWidth: '9.5em'` (locked).
      const result = buildUpdatedAtColumn(
        { maxWidth: undefined } satisfies UpdatedAtColumnProps,
        defaultContext
      );

      expect(result).toMatchObject({ width: '9.5em', minWidth: 'max-content' });
      expect(result).not.toHaveProperty('maxWidth');
    });

    it('respects sortable false', () => {
      const props: UpdatedAtColumnProps = { sortable: false };
      const result = buildUpdatedAtColumn(props, defaultContext);

      expect(result).toMatchObject({ sortable: false });
    });

    it('forces sortable false when sorting is unsupported', () => {
      const context: ColumnBuilderContext = {
        ...defaultContext,
        supports: {
          sorting: false,
          pagination: true,
          search: true,
          selection: true,
          tags: false,
          starred: false,
          userProfiles: false,
        },
      };

      const result = buildUpdatedAtColumn({}, context);

      expect(result).toMatchObject({ sortable: false });
    });

    it('provides a render function', () => {
      const result = buildUpdatedAtColumn({}, defaultContext) as UpdatedAtColumn;
      expect(result.render).toBeInstanceOf(Function);
    });

    it('renders an UpdatedAtCell with the item date', () => {
      const result = buildUpdatedAtColumn({}, defaultContext) as UpdatedAtColumn;
      const item: ContentListItem = {
        id: '1',
        title: 'Test',
        updatedAt: new Date('2025-01-15T10:30:00Z'),
      };

      const element = result.render?.(item.updatedAt, item);
      const { container } = render(<I18nProvider>{element}</I18nProvider>);
      expect(
        container.querySelector('[data-test-subj="content-list-table-updatedAt-value"]')
      ).toBeInTheDocument();
    });

    it('renders an UpdatedAtCell with a dash for missing dates', () => {
      const result = buildUpdatedAtColumn({}, defaultContext) as UpdatedAtColumn;
      const item: ContentListItem = { id: '1', title: 'Test' };

      const element = result.render?.(undefined, item);
      render(<I18nProvider>{element}</I18nProvider>);
      expect(screen.getByTestId('content-list-table-updatedAt-unknown')).toHaveTextContent('-');
    });
  });
});
