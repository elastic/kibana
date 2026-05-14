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

    it('returns `undefined` when `actions.edit` is configured but empty (no handler/href)', () => {
      // Defensive runtime guard. The discriminated union prevents this at
      // compile time, but a JS consumer could still construct an empty
      // object; the builder should skip rather than emit a bad action.
      const context: ActionBuilderContext = {
        ...defaultContext,
        // Cast through `unknown` to bypass the discriminated union, which
        // statically forbids an empty `ActionConfig`.
        itemConfig: { actions: { edit: {} as unknown as never } },
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

    it('forwards the consumer `enabled` predicate', () => {
      const enabled = jest.fn(() => false);
      const result = buildEditAction({ enabled }, defaultContext);
      const item = { id: '1', title: 'Test' };

      expect(result?.enabled?.(item)).toBe(false);
      expect(enabled).toHaveBeenCalledWith(item);
    });

    describe('with `actions.edit.getItemActionHref`', () => {
      const item = { id: '42', title: 'Test' };

      const hrefContext: ActionBuilderContext = {
        ...defaultContext,
        itemConfig: {
          actions: { edit: { getItemActionHref: (i) => `/edit/${i.id}` } },
        },
      };

      it('renders as an `<a href>` link when `getItemActionHref` is configured', () => {
        const result = buildEditAction({}, hrefContext);

        expect(result).toHaveProperty('href');
        expect(result).not.toHaveProperty('onClick');
      });

      it('forwards the per-item href via the function', () => {
        const result = buildEditAction({}, hrefContext);
        const href = (result?.href as (i: typeof item) => string)(item);

        expect(href).toBe('/edit/42');
      });

      it('keeps the default name/description/icon when only an href is configured', () => {
        const result = buildEditAction({}, hrefContext);

        expect(result).toMatchObject({
          name: 'Edit',
          description: expect.any(String),
          icon: 'pencil',
          type: 'icon',
          isPrimary: true,
        });
      });
    });
  });
});
