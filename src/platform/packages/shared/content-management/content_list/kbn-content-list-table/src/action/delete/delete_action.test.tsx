/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { ActionBuilderContext, DeleteActionProps } from '../types';
import { buildDeleteAction } from './delete_action';

const onDelete = jest.fn();

const defaultContext: ActionBuilderContext = {
  itemConfig: {
    actions: { delete: { onBulkAction: jest.fn(async () => {}) } },
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
  actions: { onDelete },
};

describe('delete action builder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildDeleteAction', () => {
    it('returns an action with defaults when props are empty and `actions.delete.onBulkAction` is configured', () => {
      const result = buildDeleteAction({}, defaultContext);

      expect(result).toMatchObject({
        name: 'Delete',
        description: expect.any(String),
        icon: 'trash',
        type: 'icon',
        color: 'danger',
        isPrimary: true,
        'data-test-subj': 'content-list-table-action-delete',
      });
    });

    it('returns `undefined` when in read-only mode', () => {
      const context: ActionBuilderContext = { ...defaultContext, isReadOnly: true };
      const result = buildDeleteAction({}, context);

      expect(result).toBeUndefined();
    });

    it('returns `undefined` when no bulk-delete handler is configured', () => {
      const context: ActionBuilderContext = {
        ...defaultContext,
        itemConfig: {},
      };
      const result = buildDeleteAction({}, context);

      expect(result).toBeUndefined();
    });

    it('returns `undefined` when `itemConfig` is undefined', () => {
      const context: ActionBuilderContext = {
        ...defaultContext,
        itemConfig: undefined,
      };
      const result = buildDeleteAction({}, context);

      expect(result).toBeUndefined();
    });

    it('uses custom label when provided', () => {
      const props: DeleteActionProps = { label: 'Remove' };
      const result = buildDeleteAction(props, defaultContext);

      expect(result?.name).toBe('Remove');
    });

    it('calls `actions.onDelete` with the item wrapped in an array', () => {
      const result = buildDeleteAction({}, defaultContext);
      const item = { id: '1', title: 'Test' };

      result?.onClick?.(item, {} as React.MouseEvent);

      expect(onDelete).toHaveBeenCalledWith([item]);
    });

    it('does not call `itemConfig.actions.delete.onBulkAction` directly', () => {
      const onBulkAction = jest.fn(async () => {});
      const context: ActionBuilderContext = {
        ...defaultContext,
        itemConfig: { actions: { delete: { onBulkAction } } },
      };
      const result = buildDeleteAction({}, context);
      const item = { id: '1', title: 'Test' };

      result?.onClick?.(item, {} as React.MouseEvent);

      expect(onBulkAction).not.toHaveBeenCalled();
    });
  });

  describe('with `itemConfig.actions.delete.restriction`', () => {
    const freeItem = { id: '1', title: 'Free', managed: false };
    const managedItem = { id: '2', title: 'Managed', managed: true };

    const restrictManaged = (item: { managed?: boolean }) =>
      item.managed ? 'Managed dashboards cannot be deleted.' : undefined;

    const contextWithRestriction = (
      restriction: (item: { managed?: boolean }) => string | undefined
    ): ActionBuilderContext => ({
      ...defaultContext,
      itemConfig: {
        actions: {
          delete: { onBulkAction: jest.fn(async () => {}), restriction },
        },
      },
    });

    it('disables the row icon when the item has a restriction reason', () => {
      const result = buildDeleteAction({}, contextWithRestriction(restrictManaged));

      // EUI's `enabled` predicate: `false` => disabled.
      expect((result!.enabled as (item: typeof managedItem) => boolean)(managedItem)).toBe(false);
      expect((result!.enabled as (item: typeof freeItem) => boolean)(freeItem)).toBe(true);
    });

    it('surfaces the restriction reason as the per-row tooltip via `description`', () => {
      const result = buildDeleteAction({}, contextWithRestriction(restrictManaged));
      const description = result!.description as (item: typeof managedItem) => string;

      expect(description(managedItem)).toBe('Managed dashboards cannot be deleted.');
      // Default description (the i18n action description) is used for unrestricted items.
      expect(description(freeItem)).toEqual(expect.any(String));
      expect(description(freeItem)).not.toBe('Managed dashboards cannot be deleted.');
    });

    it('lets the consumer `enabled` further narrow but never expand the auto verdict', () => {
      // Auto-derivation says `freeItem` is OK; consumer says no -> result is no.
      const result = buildDeleteAction(
        { enabled: (item) => item.id !== '1' },
        contextWithRestriction(restrictManaged)
      );
      const enabled = result!.enabled as (item: typeof freeItem) => boolean;

      expect(enabled(freeItem)).toBe(false);
      expect(enabled(managedItem)).toBe(false);
    });

    it('keeps the icon enabled when no restriction predicate is configured', () => {
      const result = buildDeleteAction({}, defaultContext);
      const enabled = result!.enabled as (item: typeof freeItem) => boolean;

      expect(enabled(freeItem)).toBe(true);
      expect(enabled(managedItem)).toBe(true);
    });

    it('keeps the static description when no restriction predicate is configured', () => {
      const result = buildDeleteAction({}, defaultContext);
      expect(typeof result?.description).toBe('string');
    });

    it('ignores `actions.edit.restriction` when building the delete action', () => {
      const context: ActionBuilderContext = {
        ...defaultContext,
        itemConfig: {
          actions: {
            delete: { onBulkAction: jest.fn(async () => {}) },
            edit: { onItemAction: jest.fn(), restriction: () => 'Cannot edit' },
          },
        },
      };

      const result = buildDeleteAction({}, context);

      expect(typeof result?.description).toBe('string');
    });
  });
});
