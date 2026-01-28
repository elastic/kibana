/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import type { ItemConfig, ContentListItem } from '@kbn/content-list-provider';
import type { ColumnBuilderContext } from '../types';
import { buildColumn, parseProps } from './actions_builder';
import type { KnownActionDescriptor, CustomActionDescriptor } from './parse_actions';

// Mock parse_actions module.
jest.mock('./parse_actions', () => ({
  parseActionsFromChildren: jest.fn(),
  isKnownAction: jest.requireActual('./parse_actions').isKnownAction,
  KNOWN_ACTION_IDS: ['viewDetails', 'edit', 'delete', 'duplicate', 'export'],
}));

const mockItem: ContentListItem = {
  id: '1',
  title: 'Test Item',
};

const createContext = (overrides?: Partial<ColumnBuilderContext>): ColumnBuilderContext => ({
  itemConfig: undefined,
  isReadOnly: false,
  ...overrides,
});

const createItemConfig = (actions?: Partial<NonNullable<ItemConfig['actions']>>): ItemConfig => ({
  actions: {
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onViewDetails: jest.fn(),
    onDuplicate: jest.fn(),
    onExport: jest.fn(),
    ...actions,
  },
});

describe('actions_builder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseProps', () => {
    it('parses element props correctly', () => {
      const element = {
        props: {
          columnTitle: 'Custom Actions',
          width: '200px',
          children: null,
        },
      } as unknown as ReactElement;

      const result = parseProps(element);

      expect(result.columnTitle).toBe('Custom Actions');
      expect(result.width).toBe('200px');
    });

    it('handles empty props', () => {
      const element = { props: {} } as unknown as ReactElement;

      const result = parseProps(element);

      expect(result.columnTitle).toBeUndefined();
      expect(result.width).toBeUndefined();
    });

    it('handles undefined props', () => {
      const element = {} as unknown as ReactElement;

      const result = parseProps(element);

      expect(result.columnTitle).toBeUndefined();
      expect(result.width).toBeUndefined();
    });
  });

  describe('buildColumn', () => {
    it('returns null when config is false', () => {
      const context = createContext({ itemConfig: createItemConfig() });

      const result = buildColumn(false, context);

      expect(result).toBeNull();
    });

    it('returns null when isReadOnly is true', () => {
      const context = createContext({
        itemConfig: createItemConfig(),
        isReadOnly: true,
      });

      const result = buildColumn(true, context);

      expect(result).toBeNull();
    });

    it('returns null when no itemConfig is provided', () => {
      const context = createContext({ itemConfig: undefined });

      const result = buildColumn(true, context);

      expect(result).toBeNull();
    });

    it('returns null when itemConfig has no actions', () => {
      const context = createContext({ itemConfig: { actions: undefined } });

      const result = buildColumn(true, context);

      expect(result).toBeNull();
    });

    it('builds column with default actions when config is true', () => {
      const context = createContext({ itemConfig: createItemConfig() });

      const result = buildColumn(true, context);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Actions');
      expect(result?.width).toBe('140px');
      expect(result?.actions).toBeDefined();
      expect(result?.actions.length).toBeGreaterThan(0);
    });

    it('builds column with custom title and width', () => {
      const context = createContext({ itemConfig: createItemConfig() });
      const config = {
        columnTitle: 'Custom Title',
        width: '200px',
      };

      const result = buildColumn(config, context);

      expect(result?.name).toBe('Custom Title');
      expect(result?.width).toBe('200px');
    });

    it('includes edit action when onEdit is configured', () => {
      const onEdit = jest.fn();
      const context = createContext({
        itemConfig: createItemConfig({ onEdit, onDelete: undefined }),
      });

      const result = buildColumn(true, context);

      expect(result?.actions).toBeDefined();
      const editAction = result?.actions.find(
        (a) => a['data-test-subj'] === 'content-list-table-action-edit'
      );
      expect(editAction).toBeDefined();
      expect(editAction?.isPrimary).toBe(true);
    });

    it('includes viewDetails action when onViewDetails is configured', () => {
      const onViewDetails = jest.fn();
      const context = createContext({
        itemConfig: createItemConfig({ onViewDetails }),
      });

      const result = buildColumn(true, context);

      const viewAction = result?.actions.find(
        (a) => a['data-test-subj'] === 'content-list-table-action-viewDetails'
      );
      expect(viewAction).toBeDefined();
      expect(viewAction?.isPrimary).toBe(true);
    });

    it('includes delete action when onDelete is configured', () => {
      const onDelete = jest.fn();
      const context = createContext({
        itemConfig: createItemConfig({ onDelete }),
      });

      const result = buildColumn(true, context);

      const deleteAction = result?.actions.find(
        (a) => a['data-test-subj'] === 'content-list-table-action-delete'
      );
      expect(deleteAction).toBeDefined();
      expect(deleteAction?.color).toBe('danger');
      expect(deleteAction?.isPrimary).toBe(false);
    });

    it('includes duplicate action when onDuplicate is configured', () => {
      const onDuplicate = jest.fn();
      const context = createContext({
        itemConfig: createItemConfig({ onDuplicate }),
      });

      const result = buildColumn(true, context);

      const duplicateAction = result?.actions.find(
        (a) => a['data-test-subj'] === 'content-list-table-action-duplicate'
      );
      expect(duplicateAction).toBeDefined();
    });

    it('includes export action when onExport is configured', () => {
      const onExport = jest.fn();
      const context = createContext({
        itemConfig: createItemConfig({ onExport }),
      });

      const result = buildColumn(true, context);

      const exportAction = result?.actions.find(
        (a) => a['data-test-subj'] === 'content-list-table-action-export'
      );
      expect(exportAction).toBeDefined();
    });

    it('handles action config with isEnabled predicate', () => {
      const isEnabled = jest.fn().mockReturnValue(true);
      const context = createContext({
        itemConfig: createItemConfig({
          onEdit: { handler: jest.fn(), isEnabled },
        }),
      });

      const result = buildColumn(true, context);

      const editAction = result?.actions.find(
        (a) => a['data-test-subj'] === 'content-list-table-action-edit'
      );
      expect(editAction?.enabled).toBe(isEnabled);
    });

    it('includes custom actions from provider', () => {
      const customHandler = jest.fn();
      const context = createContext({
        itemConfig: createItemConfig({
          custom: [
            {
              id: 'share',
              label: 'Share',
              iconType: 'share',
              handler: customHandler,
            },
          ],
        }),
      });

      const result = buildColumn(true, context);

      const shareAction = result?.actions.find(
        (a) => a['data-test-subj'] === 'content-list-table-action-share'
      );
      expect(shareAction).toBeDefined();
      expect(shareAction?.isPrimary).toBe(false);
    });

    it('uses custom data-test-subj for custom actions when provided', () => {
      const context = createContext({
        itemConfig: createItemConfig({
          custom: [
            {
              id: 'share',
              label: 'Share',
              iconType: 'share',
              handler: jest.fn(),
              'data-test-subj': 'custom-share-button',
            },
          ],
        }),
      });

      const result = buildColumn(true, context);

      const shareAction = result?.actions.find(
        (a) => a['data-test-subj'] === 'custom-share-button'
      );
      expect(shareAction).toBeDefined();
    });

    it('builds column with specified actions only', () => {
      const context = createContext({ itemConfig: createItemConfig() });
      const specifiedActions: KnownActionDescriptor[] = [{ id: 'edit' }, { id: 'delete' }];

      const result = buildColumn({ parsedActions: specifiedActions }, context);

      expect(result?.actions.length).toBe(2);
    });

    it('handles custom action descriptors', () => {
      const customHandler = jest.fn();
      const context = createContext({ itemConfig: createItemConfig() });
      const customAction: CustomActionDescriptor = {
        id: 'custom',
        label: 'Custom Action',
        iconType: 'gear',
        handler: customHandler,
      };

      const result = buildColumn({ parsedActions: [customAction] }, context);

      expect(result?.actions.length).toBe(1);
      expect(result?.actions[0]['data-test-subj']).toBe('content-list-table-action-custom');
    });

    it('returns null when no actions are configured', () => {
      const context = createContext({
        itemConfig: {
          actions: {
            onEdit: undefined,
            onDelete: undefined,
            onViewDetails: undefined,
          },
        },
      });

      const result = buildColumn(true, context);

      expect(result).toBeNull();
    });

    it('calls action handler when onClick is invoked', () => {
      const onEdit = jest.fn();
      const context = createContext({
        itemConfig: createItemConfig({ onEdit }),
      });

      const result = buildColumn(true, context);
      const editAction = result?.actions.find(
        (a) => a['data-test-subj'] === 'content-list-table-action-edit'
      );

      // Simulate click.
      (editAction?.onClick as (item: ContentListItem) => void)?.(mockItem);

      expect(onEdit).toHaveBeenCalledWith(mockItem);
    });

    it('warns when known action has no handler in provider', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const context = createContext({
        itemConfig: {
          actions: {
            // Only onEdit defined, not onDelete.
            onEdit: jest.fn(),
          },
        },
      });

      // Request delete action which has no handler.
      const specifiedActions = [{ id: 'delete' }] as const;
      buildColumn(
        {
          parsedActions: specifiedActions as unknown as Parameters<
            typeof buildColumn
          >[0] extends object
            ? Parameters<typeof buildColumn>[0]['parsedActions']
            : never,
        },
        context
      );

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('no handler in provider'));

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });

    it('uses aria-label for custom action description when provided', () => {
      const customHandler = jest.fn();
      const context = createContext({ itemConfig: createItemConfig() });
      const customAction = {
        id: 'custom',
        label: 'Custom Action',
        iconType: 'gear',
        handler: customHandler,
        'aria-label': 'Custom accessibility label',
      };

      const result = buildColumn({ parsedActions: [customAction] }, context);
      const action = result?.actions[0];

      expect(action?.description).toBe('Custom accessibility label');
    });

    it('uses function description for custom action without aria-label', () => {
      const customHandler = jest.fn();
      const context = createContext({ itemConfig: createItemConfig() });
      const customAction = {
        id: 'custom',
        label: 'Custom Action',
        iconType: 'gear',
        handler: customHandler,
      };

      const result = buildColumn({ parsedActions: [customAction] }, context);
      const action = result?.actions[0];

      // Description should be a function.
      expect(typeof action?.description).toBe('function');
      const descFn = action?.description as (item: ContentListItem) => string;
      expect(descFn(mockItem)).toBe('Custom Action Test Item');
    });

    it('generates description functions for duplicate action', () => {
      const onDuplicate = jest.fn();
      const context = createContext({
        itemConfig: createItemConfig({
          onEdit: undefined,
          onViewDetails: undefined,
          onDelete: undefined,
          onExport: undefined,
          onDuplicate,
        }),
      });

      const result = buildColumn(true, context);
      const duplicateAction = result?.actions.find(
        (a) => a['data-test-subj'] === 'content-list-table-action-duplicate'
      );

      expect(typeof duplicateAction?.description).toBe('function');
      const descFn = duplicateAction?.description as (item: ContentListItem) => string;
      expect(descFn(mockItem)).toBe('Duplicate Test Item');
    });

    it('generates description functions for export action', () => {
      const onExport = jest.fn();
      const context = createContext({
        itemConfig: createItemConfig({
          onEdit: undefined,
          onViewDetails: undefined,
          onDelete: undefined,
          onDuplicate: undefined,
          onExport,
        }),
      });

      const result = buildColumn(true, context);
      const exportAction = result?.actions.find(
        (a) => a['data-test-subj'] === 'content-list-table-action-export'
      );

      expect(typeof exportAction?.description).toBe('function');
      const descFn = exportAction?.description as (item: ContentListItem) => string;
      expect(descFn(mockItem)).toBe('Export Test Item');
    });

    it('generates description functions for delete action', () => {
      const onDelete = jest.fn();
      const context = createContext({
        itemConfig: createItemConfig({
          onEdit: undefined,
          onViewDetails: undefined,
          onDuplicate: undefined,
          onExport: undefined,
          onDelete,
        }),
      });

      const result = buildColumn(true, context);
      const deleteAction = result?.actions.find(
        (a) => a['data-test-subj'] === 'content-list-table-action-delete'
      );

      expect(typeof deleteAction?.description).toBe('function');
      const descFn = deleteAction?.description as (item: ContentListItem) => string;
      expect(descFn(mockItem)).toBe('Delete Test Item');
    });

    it('generates description functions for provider custom actions', () => {
      const context = createContext({
        itemConfig: createItemConfig({
          onEdit: undefined,
          onViewDetails: undefined,
          onDelete: undefined,
          onDuplicate: undefined,
          onExport: undefined,
          custom: [
            {
              id: 'share',
              label: 'Share',
              iconType: 'share',
              handler: jest.fn(),
            },
          ],
        }),
      });

      const result = buildColumn(true, context);
      const shareAction = result?.actions.find(
        (a) => a['data-test-subj'] === 'content-list-table-action-share'
      );

      expect(typeof shareAction?.description).toBe('function');
      const descFn = shareAction?.description as (item: ContentListItem) => string;
      expect(descFn(mockItem)).toBe('Share Test Item');
    });

    it('uses tooltip for known action name when provided', () => {
      const context = createContext({ itemConfig: createItemConfig() });
      const specifiedActions = [{ id: 'edit', tooltip: 'Edit this dashboard' }];

      const result = buildColumn({ parsedActions: specifiedActions }, context);
      const editAction = result?.actions.find(
        (a) => a['data-test-subj'] === 'content-list-table-action-edit'
      );

      expect(editAction?.name).toBe('Edit this dashboard');
    });

    it('uses aria-label for known action description when provided', () => {
      const context = createContext({ itemConfig: createItemConfig() });
      const specifiedActions = [{ id: 'edit', 'aria-label': 'Edit the selected item' }];

      const result = buildColumn({ parsedActions: specifiedActions }, context);
      const editAction = result?.actions.find(
        (a) => a['data-test-subj'] === 'content-list-table-action-edit'
      );

      expect(editAction?.description).toBe('Edit the selected item');
    });

    it('uses tooltip for custom action tooltip when provided', () => {
      const context = createContext({
        itemConfig: createItemConfig({
          onEdit: undefined,
          custom: [
            {
              id: 'archive',
              label: 'Archive',
              iconType: 'folderClosed',
              tooltip: 'Archive this item',
              handler: jest.fn(),
            },
          ],
        }),
      });

      const result = buildColumn(true, context);
      const archiveAction = result?.actions.find(
        (a) => a['data-test-subj'] === 'content-list-table-action-archive'
      );

      expect(archiveAction?.name).toBe('Archive this item');
    });

    it('passes color for custom actions', () => {
      const context = createContext({
        itemConfig: createItemConfig({
          onEdit: undefined,
          custom: [
            {
              id: 'warning',
              label: 'Warning',
              iconType: 'warning',
              color: 'warning',
              handler: jest.fn(),
            },
          ],
        }),
      });

      const result = buildColumn(true, context);
      const warningAction = result?.actions.find(
        (a) => a['data-test-subj'] === 'content-list-table-action-warning'
      );

      expect(warningAction?.color).toBe('warning');
    });

    it('passes isEnabled for custom actions', () => {
      const isEnabled = jest.fn().mockReturnValue(false);
      const context = createContext({
        itemConfig: createItemConfig({
          onEdit: undefined,
          custom: [
            {
              id: 'conditional',
              label: 'Conditional',
              iconType: 'check',
              handler: jest.fn(),
              isEnabled,
            },
          ],
        }),
      });

      const result = buildColumn(true, context);
      const conditionalAction = result?.actions.find(
        (a) => a['data-test-subj'] === 'content-list-table-action-conditional'
      );

      expect(conditionalAction?.enabled).toBe(isEnabled);
    });
  });
});
