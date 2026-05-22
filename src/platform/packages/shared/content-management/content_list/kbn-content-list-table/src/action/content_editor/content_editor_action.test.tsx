/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { ActionBuilderContext } from '../types';
import { buildContentEditorAction } from './content_editor_action';

const open = jest.fn();

const defaultContext: ActionBuilderContext = {
  itemConfig: undefined,
  isReadOnly: false,
  entityName: 'dashboard',
  features: { contentEditor: { open } },
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

describe('content editor action builder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildContentEditorAction', () => {
    it('returns an action when `features.contentEditor.open` is configured', () => {
      const result = buildContentEditorAction({}, defaultContext);

      expect(result).toMatchObject({
        description: expect.any(String),
        icon: 'inspect',
        type: 'icon',
        'data-test-subj': 'content-list-table-action-inspect',
      });
    });

    it('returns `undefined` when `features.contentEditor.open` is missing', () => {
      const context: ActionBuilderContext = {
        ...defaultContext,
        features: { contentEditor: {} },
      };
      const result = buildContentEditorAction({}, context);

      expect(result).toBeUndefined();
    });

    it('returns `undefined` when `features.contentEditor` is missing', () => {
      const context: ActionBuilderContext = {
        ...defaultContext,
        features: {},
      };
      const result = buildContentEditorAction({}, context);

      expect(result).toBeUndefined();
    });

    it('returns `undefined` when `features` is missing entirely', () => {
      const context: ActionBuilderContext = {
        ...defaultContext,
        features: undefined,
      };
      const result = buildContentEditorAction({}, context);

      expect(result).toBeUndefined();
    });

    it('defaults to a terse "View details" label', () => {
      const result = buildContentEditorAction({}, defaultContext);
      const item = { id: '1', title: 'My Dashboard' };

      const name = typeof result?.name === 'function' ? result.name(item) : result?.name;
      expect(name).toBe('View details');
      expect(result?.description).toBe('View details');
    });

    it('calls `features.contentEditor.open` when onClick is triggered', () => {
      const result = buildContentEditorAction({}, defaultContext);
      const item = { id: '1', title: 'Test' };

      result?.onClick?.(item, {} as React.MouseEvent);
      expect(open).toHaveBeenCalledWith(item);
    });

    it('uses custom label when provided', () => {
      const result = buildContentEditorAction({ label: 'Details' }, defaultContext);

      expect(result).toMatchObject({ name: 'Details' });
    });

    it('forwards the consumer `enabled` predicate when supplied', () => {
      const enabled = (item: { id: string }) => item.id !== 'blocked';
      const result = buildContentEditorAction({ enabled }, defaultContext);

      const allowedItem = { id: 'allowed', title: 'A' };
      const blockedItem = { id: 'blocked', title: 'B' };
      const enabledFn = result?.enabled as (item: typeof allowedItem) => boolean;

      expect(enabledFn(allowedItem)).toBe(true);
      expect(enabledFn(blockedItem)).toBe(false);
    });
  });
});
