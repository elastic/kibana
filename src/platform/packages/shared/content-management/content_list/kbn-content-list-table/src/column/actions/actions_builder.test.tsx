/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { DefaultItemAction, EuiTableActionsColumnType } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import type { ColumnBuilderContext } from '../types';
import { buildActionsColumn, type ActionsColumnProps } from './actions_builder';
import { Action, EditAction, DeleteAction } from '../../action';

/** Helper to cast the result to the actions column type for assertions. */
type ActionsColumn = EuiTableActionsColumnType<ContentListItem> & {
  'data-test-subj'?: string;
};

const defaultContext: ColumnBuilderContext = {
  itemConfig: {
    actions: {
      edit: { onItemAction: jest.fn() },
      delete: { onBulkAction: jest.fn(async () => {}) },
    },
  },
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

      it('includes edit action when `actions.edit.onItemAction` is configured', () => {
        const context: ColumnBuilderContext = {
          ...defaultContext,
          itemConfig: { actions: { edit: { onItemAction: jest.fn() } } },
        };
        const result = buildActionsColumn({}, context) as ActionsColumn;

        expect(result).toBeDefined();
        expect(result.actions).toHaveLength(1);
        expect(result.actions[0]).toMatchObject({
          icon: 'pencil',
        });
      });

      it('includes edit action when only `actions.edit.getItemActionHref` is configured', () => {
        const context: ColumnBuilderContext = {
          ...defaultContext,
          itemConfig: { actions: { edit: { getItemActionHref: (i) => `/edit/${i.id}` } } },
        };
        const result = buildActionsColumn({}, context) as ActionsColumn;

        expect(result).toBeDefined();
        expect(result.actions).toHaveLength(1);
        expect(result.actions[0]).toMatchObject({ icon: 'pencil' });
        expect(result.actions[0]).toHaveProperty('href');
      });

      it('includes delete action when `actions.delete.onBulkAction` is configured', () => {
        const context: ColumnBuilderContext = {
          ...defaultContext,
          itemConfig: { actions: { delete: { onBulkAction: jest.fn(async () => {}) } } },
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

      it('returns `undefined` in read-only mode when `features.contentEditor.open` is not configured', () => {
        const context: ColumnBuilderContext = {
          ...defaultContext,
          isReadOnly: true,
        };
        const result = buildActionsColumn({}, context);

        expect(result).toBeUndefined();
      });

      it('returns only the content editor action in read-only mode when `features.contentEditor.open` is configured', () => {
        const context: ColumnBuilderContext = {
          ...defaultContext,
          isReadOnly: true,
          features: { contentEditor: { open: jest.fn() } },
        };
        const result = buildActionsColumn({}, context) as ActionsColumn;

        expect(result).toBeDefined();
        expect(result.actions).toHaveLength(1);
        expect(result.actions[0]).toMatchObject({
          icon: 'inspect',
          'data-test-subj': 'content-list-table-action-inspect',
        });
      });

      it('includes the content editor action alongside edit and delete when `features.contentEditor.open` is configured', () => {
        const context: ColumnBuilderContext = {
          ...defaultContext,
          features: { contentEditor: { open: jest.fn() } },
        };
        const result = buildActionsColumn({}, context) as ActionsColumn;

        expect(result).toBeDefined();
        expect(result.actions).toHaveLength(3);
        expect(result.actions[0]).toMatchObject({ icon: 'pencil' });
        expect(result.actions[1]).toMatchObject({ icon: 'trash' });
        expect(result.actions[2]).toMatchObject({ icon: 'inspect' });
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

      it('renders a custom `<Action>` when its config is wired in `itemConfig.actions[id]`', () => {
        const onArchive = jest.fn();
        const context: ColumnBuilderContext = {
          ...defaultContext,
          itemConfig: {
            actions: { archive: { onItemAction: onArchive } },
          },
        };

        const props: ActionsColumnProps = {
          children: <Action id="archive" name="Archive" icon="folderClosed" />,
        };
        const result = buildActionsColumn(props, context) as ActionsColumn;

        expect(result).toBeDefined();
        expect(result.actions).toHaveLength(1);
        const action = result.actions[0] as DefaultItemAction<ContentListItem>;
        expect(action).toMatchObject({
          name: 'Archive',
          icon: 'folderClosed',
          'data-test-subj': 'content-list-table-action-archive',
        });
        expect(action.onClick).toEqual(expect.any(Function));
      });

      it('composes a custom `<Action>` tooltip and enabled predicate with its restriction', () => {
        const context: ColumnBuilderContext = {
          ...defaultContext,
          itemConfig: {
            actions: {
              archive: {
                onItemAction: jest.fn(),
                restriction: (item) =>
                  item.managed ? 'Managed items cannot be archived.' : undefined,
              },
            },
          },
        };

        const props: ActionsColumnProps = {
          children: (
            <Action
              id="archive"
              name="Archive"
              description="Archive this item"
              icon="folderClosed"
            />
          ),
        };
        const result = buildActionsColumn(props, context) as ActionsColumn;
        const action = result.actions[0] as DefaultItemAction<ContentListItem>;

        const freeItem = { id: '1', title: 'Free', managed: false };
        const managedItem = { id: '2', title: 'Managed', managed: true };
        expect(action.enabled?.(freeItem)).toBe(true);
        expect(action.enabled?.(managedItem)).toBe(false);

        const description = action.description as (item: ContentListItem) => string | undefined;
        expect(description(freeItem)).toBe('Archive this item');
        expect(description(managedItem)).toBe('Managed items cannot be archived.');
      });

      it('skips a custom `<Action>` when its `itemConfig.actions[id]` config is missing', () => {
        // Regression: emitting an action object without `onClick`/`href`
        // crashes EUI at render. The resolver returns `undefined` so the
        // missing wiring degrades to a no-op instead of a table crash.
        const props: ActionsColumnProps = {
          children: (
            <>
              <EditAction />
              <Action id="archive" name="Archive" icon="folderClosed" />
            </>
          ),
        };
        const result = buildActionsColumn(props, defaultContext) as ActionsColumn;

        expect(result).toBeDefined();
        expect(result.actions).toHaveLength(1);
        expect(result.actions[0]).toMatchObject({ icon: 'pencil' });
      });

      it('renders a custom `<Action>` as an `<a href>` link when `getItemActionHref` is configured', () => {
        const context: ColumnBuilderContext = {
          ...defaultContext,
          itemConfig: {
            actions: { archive: { getItemActionHref: (i) => `/archive/${i.id}` } },
          },
        };
        const props: ActionsColumnProps = {
          children: <Action id="archive" name="Archive" icon="folderClosed" />,
        };
        const result = buildActionsColumn(props, context) as ActionsColumn;
        const action = result.actions[0] as DefaultItemAction<ContentListItem>;

        expect(action).toHaveProperty('href');
        expect(action).not.toHaveProperty('onClick');
        const href = (action.href as (i: ContentListItem) => string)({ id: 'a', title: 'A' });
        expect(href).toBe('/archive/a');
      });
    });

    describe('custom configuration', () => {
      it('applies custom width', () => {
        const props: ActionsColumnProps = {
          width: '5em',
          minWidth: '5em',
          maxWidth: '5em',
        };
        const result = buildActionsColumn(props, defaultContext);

        expect(result).toMatchObject({ width: '5em', minWidth: '5em', maxWidth: '5em' });
      });

      it('computes default width / minWidth / maxWidth from the action count when not specified', () => {
        const result = buildActionsColumn({}, defaultContext);

        // `2 * 32` (icon-button width) + `1 * 4` (gap) + `2 * 8` (cell padding) = 84px.
        // `minWidth: 'max-content'` lets translated headers expand the column
        // when wider than the icon row; `maxWidth` pins it to the derived
        // width so the column never absorbs slack on full-width pages.
        expect(result).toMatchObject({
          width: '84px',
          minWidth: 'max-content',
          maxWidth: '84px',
        });
      });

      it('falls back maxWidth to the consumer-supplied width when only width is overridden', () => {
        const result = buildActionsColumn({ width: '128px' }, defaultContext);

        expect(result).toMatchObject({
          width: '128px',
          minWidth: 'max-content',
          maxWidth: '128px',
        });
      });

      it('treats explicit `undefined` as an opt-out — clears the cap so the column can absorb slack', () => {
        const result = buildActionsColumn(
          { maxWidth: undefined } satisfies ActionsColumnProps,
          defaultContext
        );

        // The derived width (84px for two actions) and the `'max-content'`
        // floor are still applied — only the cap is cleared.
        expect(result).toMatchObject({ width: '84px', minWidth: 'max-content' });
        expect(result).not.toHaveProperty('maxWidth');
      });

      it('sticks the actions column by default', () => {
        const result = buildActionsColumn({}, defaultContext);

        expect(result).toMatchObject({ sticky: true });
      });

      it('allows sticky behavior to be disabled', () => {
        const result = buildActionsColumn({ sticky: false }, defaultContext);

        expect(result).toMatchObject({ sticky: false });
      });

      it('applies custom column title', () => {
        const props: ActionsColumnProps = { columnTitle: 'Row Actions' };
        const result = buildActionsColumn(props, defaultContext);

        expect(result).toMatchObject({ name: 'Row Actions' });
      });
    });
  });
});
