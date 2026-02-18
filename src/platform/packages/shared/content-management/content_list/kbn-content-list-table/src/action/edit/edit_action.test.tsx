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
    getEditUrl: (item) => `/edit/${item.id}`,
  },
  isReadOnly: false,
  entityName: 'dashboard',
  supports: { sorting: true, pagination: true, search: true },
};

describe('edit action builder', () => {
  describe('buildEditAction', () => {
    it('returns an action with defaults when props are empty and `getEditUrl` is configured', () => {
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

    it('provides `href` when `getEditUrl` is configured', () => {
      const result = buildEditAction({}, defaultContext);

      expect(result).toHaveProperty('href');
      expect(result).not.toHaveProperty('onClick');
    });

    it('generates correct href for an item', () => {
      const result = buildEditAction({}, defaultContext);
      const href = (result?.href as (item: { id: string }) => string)({ id: '123' });

      expect(href).toBe('/edit/123');
    });

    it('provides `onClick` when only `onEdit` is configured (no `getEditUrl`)', () => {
      const onEdit = jest.fn();
      const context: ActionBuilderContext = {
        ...defaultContext,
        itemConfig: { onEdit },
      };
      const result = buildEditAction({}, context);

      expect(result).toHaveProperty('onClick');
      expect(result).not.toHaveProperty('href');
    });

    it('calls `onEdit` when onClick is triggered', () => {
      const onEdit = jest.fn();
      const context: ActionBuilderContext = {
        ...defaultContext,
        itemConfig: { onEdit },
      };
      const result = buildEditAction({}, context);
      const item = { id: '1', title: 'Test' };

      result?.onClick?.(item, {} as React.MouseEvent);
      expect(onEdit).toHaveBeenCalledWith(item);
    });

    it('composes both `href` and `onClick` when `getEditUrl` and `onEdit` are provided', () => {
      const onEdit = jest.fn();
      const context: ActionBuilderContext = {
        ...defaultContext,
        itemConfig: {
          getEditUrl: (item) => `/edit/${item.id}`,
          onEdit,
        },
      };
      const result = buildEditAction({}, context);

      expect(result).toHaveProperty('href');
      expect(result).toHaveProperty('onClick');
    });

    it('calls `onEdit` on click even when `getEditUrl` is also provided', () => {
      const onEdit = jest.fn();
      const context: ActionBuilderContext = {
        ...defaultContext,
        itemConfig: {
          getEditUrl: (item) => `/edit/${item.id}`,
          onEdit,
        },
      };
      const result = buildEditAction({}, context);
      const item = { id: '1', title: 'Test' };

      result?.onClick?.(item, {} as React.MouseEvent);
      expect(onEdit).toHaveBeenCalledWith(item);
    });
  });
});
