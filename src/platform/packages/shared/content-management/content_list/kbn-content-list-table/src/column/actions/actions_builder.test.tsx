/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiTableActionsColumnType } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { ColumnBuilderContext } from '../types';
import { buildActionsColumn, type ActionsColumnProps } from './actions_builder';
import { EditAction, DeleteAction } from '../../action';

/** Helper to cast the result to the actions column type for assertions. */
type ActionsColumn = EuiTableActionsColumnType<ContentListItem> & {
  'data-test-subj'?: string;
};

const defaultContext: ColumnBuilderContext = {
  itemConfig: {
    getEditUrl: (item) => `/edit/${item.id}`,
    onDelete: jest.fn(async () => {}),
  },
  isReadOnly: false,
  entityName: 'dashboard',
  supports: { sorting: true, pagination: true, search: true },
};

describe('actions column builder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildActionsColumn', () => {
    describe('default actions (no children)', () => {
      it('returns an actions column when edit and delete are configured', () => {
        const result = buildActionsColumn({}, defaultContext) as ActionsColumn;

        expect(result).toBeDefined();
        expect(result.name).toBe('Actions');
        expect(result.actions).toHaveLength(2);
        expect(result['data-test-subj']).toBe('content-list-table-column-actions');
      });

      it('includes edit action when `getEditUrl` is configured', () => {
        const context: ColumnBuilderContext = {
          ...defaultContext,
          itemConfig: { getEditUrl: (item) => `/edit/${item.id}` },
        };
        const result = buildActionsColumn({}, context) as ActionsColumn;

        expect(result).toBeDefined();
        expect(result.actions).toHaveLength(1);
        expect(result.actions[0]).toMatchObject({
          icon: 'pencil',
          'data-test-subj': 'content-list-table-action-edit',
        });
      });

      it('includes edit action when `onEdit` is configured', () => {
        const context: ColumnBuilderContext = {
          ...defaultContext,
          itemConfig: { onEdit: jest.fn() },
        };
        const result = buildActionsColumn({}, context) as ActionsColumn;

        expect(result).toBeDefined();
        expect(result.actions).toHaveLength(1);
        expect(result.actions[0]).toMatchObject({
          icon: 'pencil',
        });
      });

      it('includes delete action when `onDelete` is configured', () => {
        const context: ColumnBuilderContext = {
          ...defaultContext,
          itemConfig: { onDelete: jest.fn(async () => {}) },
        };
        const result = buildActionsColumn({}, context) as ActionsColumn;

        expect(result).toBeDefined();
        expect(result.actions).toHaveLength(1);
        expect(result.actions[0]).toMatchObject({
          icon: 'trash',
          color: 'danger',
          'data-test-subj': 'content-list-table-action-delete',
        });
      });

      it('returns `undefined` when no actions are available', () => {
        const context: ColumnBuilderContext = {
          ...defaultContext,
          itemConfig: {},
        };
        const result = buildActionsColumn({}, context);

        expect(result).toBeUndefined();
      });

      it('returns `undefined` in read-only mode', () => {
        const context: ColumnBuilderContext = {
          ...defaultContext,
          isReadOnly: true,
        };
        const result = buildActionsColumn({}, context);

        expect(result).toBeUndefined();
      });
    });

    describe('explicit children', () => {
      it('renders only specified actions in order', () => {
        const props: ActionsColumnProps = {
          children: (
            <>
              <EditAction />
              <DeleteAction />
            </>
          ),
        };
        const result = buildActionsColumn(props, defaultContext) as ActionsColumn;

        expect(result).toBeDefined();
        expect(result.actions).toHaveLength(2);
        expect(result.actions[0]).toMatchObject({ icon: 'pencil' });
        expect(result.actions[1]).toMatchObject({ icon: 'trash' });
      });

      it('renders only edit when only edit child is provided', () => {
        const props: ActionsColumnProps = {
          children: <EditAction />,
        };
        const result = buildActionsColumn(props, defaultContext) as ActionsColumn;

        expect(result).toBeDefined();
        expect(result.actions).toHaveLength(1);
        expect(result.actions[0]).toMatchObject({ icon: 'pencil' });
      });

      it('renders only delete when only delete child is provided', () => {
        const props: ActionsColumnProps = {
          children: <DeleteAction />,
        };
        const result = buildActionsColumn(props, defaultContext) as ActionsColumn;

        expect(result).toBeDefined();
        expect(result.actions).toHaveLength(1);
        expect(result.actions[0]).toMatchObject({ icon: 'trash' });
      });
    });

    describe('custom configuration', () => {
      it('applies custom width', () => {
        const props: ActionsColumnProps = { width: '150px' };
        const result = buildActionsColumn(props, defaultContext);

        expect(result).toMatchObject({ width: '150px' });
      });

      it('does not include width when not specified', () => {
        const result = buildActionsColumn({}, defaultContext);

        expect(result).not.toHaveProperty('width');
      });

      it('applies custom column title', () => {
        const props: ActionsColumnProps = { columnTitle: 'Row Actions' };
        const result = buildActionsColumn(props, defaultContext);

        expect(result).toMatchObject({ name: 'Row Actions' });
      });
    });
  });
});
