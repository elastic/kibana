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
import { buildInspectAction } from './inspect_action';

const onInspect = jest.fn();

const defaultContext: ActionBuilderContext = {
  itemConfig: {
    onInspect,
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

describe('inspect action builder', () => {
  describe('buildInspectAction', () => {
    it('returns an action when onInspect is configured', () => {
      const result = buildInspectAction({}, defaultContext);

      expect(result).toMatchObject({
        description: expect.any(String),
        icon: 'inspect',
        type: 'icon',
        'data-test-subj': 'content-list-table-action-inspect',
      });
    });

    it('returns `undefined` when onInspect is not configured', () => {
      const context: ActionBuilderContext = {
        ...defaultContext,
        itemConfig: {},
      };
      const result = buildInspectAction({}, context);

      expect(result).toBeUndefined();
    });

    it('returns `undefined` when itemConfig is undefined', () => {
      const context: ActionBuilderContext = {
        ...defaultContext,
        itemConfig: undefined,
      };
      const result = buildInspectAction({}, context);

      expect(result).toBeUndefined();
    });

    it('generates a dynamic name including the item title', () => {
      const result = buildInspectAction({}, defaultContext);
      const item = { id: '1', title: 'My Dashboard' };

      const name = typeof result?.name === 'function' ? result.name(item) : result?.name;
      expect(name).toContain('My Dashboard');
    });

    it('calls onInspect when onClick is triggered', () => {
      const result = buildInspectAction({}, defaultContext);
      const item = { id: '1', title: 'Test' };

      result?.onClick?.(item, {} as React.MouseEvent);
      expect(onInspect).toHaveBeenCalledWith(item);
    });

    it('uses custom label when provided', () => {
      const result = buildInspectAction({ label: 'Details' }, defaultContext);

      expect(result).toMatchObject({ name: 'Details' });
    });
  });
});
