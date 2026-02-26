/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ReactNode } from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ActionBuilderContext, DeleteActionProps } from '../types';
import { buildDeleteAction } from './delete_action';

const onDelete = jest.fn();

const defaultContext: ActionBuilderContext = {
  itemConfig: {
    onDelete: jest.fn(async () => {}),
  },
  isReadOnly: false,
  entityName: 'dashboard',
  supports: { sorting: true, pagination: true, search: true, selection: true },
  actions: { onDelete },
};

describe('delete action builder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildDeleteAction', () => {
    it('returns an action with defaults when props are empty and `onDelete` is configured', () => {
      const result = buildDeleteAction({}, defaultContext);

      expect(result).toMatchObject({
        description: expect.any(String),
        icon: 'trash',
        type: 'icon',
        color: 'danger',
        isPrimary: true,
        'data-test-subj': 'content-list-table-action-delete',
      });

      const { getByText } = render(<>{result!.name as ReactNode}</>);
      expect(getByText('Delete')).toBeInTheDocument();
    });

    it('returns `undefined` when in read-only mode', () => {
      const context: ActionBuilderContext = { ...defaultContext, isReadOnly: true };
      const result = buildDeleteAction({}, context);

      expect(result).toBeUndefined();
    });

    it('returns `undefined` when no `onDelete` handler is configured', () => {
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

      const { getByText } = render(<>{result!.name as ReactNode}</>);
      expect(getByText('Remove')).toBeInTheDocument();
    });

    it('calls `actions.onDelete` with the item wrapped in an array', () => {
      const result = buildDeleteAction({}, defaultContext);
      const item = { id: '1', title: 'Test' };

      result?.onClick?.(item, {} as React.MouseEvent);

      expect(onDelete).toHaveBeenCalledWith([item]);
    });

    it('does not call `itemConfig.onDelete` directly', () => {
      const itemOnDelete = jest.fn();
      const context: ActionBuilderContext = {
        ...defaultContext,
        itemConfig: { onDelete: itemOnDelete },
      };
      const result = buildDeleteAction({}, context);
      const item = { id: '1', title: 'Test' };

      result?.onClick?.(item, {} as React.MouseEvent);

      expect(itemOnDelete).not.toHaveBeenCalled();
    });
  });
});
