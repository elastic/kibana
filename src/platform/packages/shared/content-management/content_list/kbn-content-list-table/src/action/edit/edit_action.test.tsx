/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { ActionBuilderContext, EditActionProps } from '../types';
import { buildEditAction } from './edit_action';

const defaultContext: ActionBuilderContext = {
  itemConfig: {
    actions: { edit: { onItemAction: jest.fn() } },
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

describe('edit action builder', () => {
  describe('buildEditAction', () => {
    it('returns an action with defaults when props are empty and `actions.edit.onItemAction` is configured', () => {
      const result = buildEditAction({}, defaultContext);

      expect(result).toMatchObject({
        name: 'Edit',
        description: expect.any(String),
        icon: 'pencil',
        type: 'icon',
        isPrimary: true,
        'data-test-subj': 'content-list-table-action-edit',
      });
    });

    it('returns `undefined` when in read-only mode', () => {
      const context: ActionBuilderContext = { ...defaultContext, isReadOnly: true };
      const result = buildEditAction({}, context);

      expect(result).toBeUndefined();
    });

    it('returns `undefined` when no edit handler is configured', () => {
      const context: ActionBuilderContext = {
        ...defaultContext,
        itemConfig: {},
      };
      const result = buildEditAction({}, context);

      expect(result).toBeUndefined();
    });

    it('returns `undefined` when `itemConfig` is undefined', () => {
      const context: ActionBuilderContext = {
        ...defaultContext,
        itemConfig: undefined,
      };
      const result = buildEditAction({}, context);

      expect(result).toBeUndefined();
    });

    it('uses custom label when provided', () => {
      const props: EditActionProps = { label: 'Modify' };
      const result = buildEditAction(props, defaultContext);

      expect(result).toMatchObject({ name: 'Modify' });
    });

    it('provides `onClick` and no `href`', () => {
      const result = buildEditAction({}, defaultContext);

      expect(result).toHaveProperty('onClick');
      expect(result).not.toHaveProperty('href');
    });

    it('calls `actions.edit.onItemAction` when onClick is triggered', () => {
      const onItemAction = jest.fn();
      const context: ActionBuilderContext = {
        ...defaultContext,
        itemConfig: { actions: { edit: { onItemAction } } },
      };
      const result = buildEditAction({}, context);
      const item = { id: '1', title: 'Test' };

      result?.onClick?.(item, {} as React.MouseEvent);
      expect(onItemAction).toHaveBeenCalledWith(item);
    });

    describe('with `itemConfig.actions.edit.restriction`', () => {
      const managedItem = { id: 'm', title: 'Managed', managed: true };
      const freeItem = { id: 'f', title: 'Free', managed: false };

      const restrictManaged = (item: { managed?: boolean }) =>
        item.managed ? 'Managed dashboards cannot be edited.' : undefined;

      it('disables the icon and surfaces the reason as a description function', () => {
        const context: ActionBuilderContext = {
          ...defaultContext,
          itemConfig: {
            actions: { edit: { onItemAction: jest.fn(), restriction: restrictManaged } },
          },
        };

        const result = buildEditAction({}, context);

        expect(typeof result?.enabled).toBe('function');
        expect(result?.enabled?.(freeItem)).toBe(true);
        expect(result?.enabled?.(managedItem)).toBe(false);

        expect(typeof result?.description).toBe('function');
        const description = result?.description as (item: typeof freeItem) => string;
        expect(description(freeItem)).toBe('Edit this item');
        expect(description(managedItem)).toBe('Managed dashboards cannot be edited.');
      });

      it('keeps the static description when no restriction is configured', () => {
        const result = buildEditAction({}, defaultContext);
        expect(typeof result?.description).toBe('string');
      });

      it("doesn't expand the consumer's `enabled` predicate", () => {
        // Consumer disallows everything; restriction allows everything;
        // composed verdict is `false` (consumer narrows, restriction
        // can't expand).
        const context: ActionBuilderContext = {
          ...defaultContext,
          itemConfig: {
            actions: { edit: { onItemAction: jest.fn(), restriction: () => undefined } },
          },
        };

        const result = buildEditAction({ enabled: () => false }, context);

        expect(result?.enabled?.(freeItem)).toBe(false);
      });

      it('disables the icon when the restriction returns a reason even if `enabled` is true', () => {
        const context: ActionBuilderContext = {
          ...defaultContext,
          itemConfig: {
            actions: { edit: { onItemAction: jest.fn(), restriction: () => 'restricted' } },
          },
        };

        const result = buildEditAction({ enabled: () => true }, context);

        expect(result?.enabled?.(freeItem)).toBe(false);
      });

      it('ignores `actions.delete.restriction` when building the edit action', () => {
        const context: ActionBuilderContext = {
          ...defaultContext,
          itemConfig: {
            actions: {
              edit: { onItemAction: jest.fn() },
              delete: { onBulkAction: jest.fn(async () => {}), restriction: () => 'Cannot delete' },
            },
          },
        };

        const result = buildEditAction({}, context);

        expect(typeof result?.description).toBe('string');
      });
    });
  });
});
