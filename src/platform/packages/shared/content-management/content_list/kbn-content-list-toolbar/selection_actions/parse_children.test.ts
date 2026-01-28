/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { parseSelectionActionsFromChildren, isKnownActionId } from './parse_children';
import { DeleteAction } from './delete';
import { ExportAction } from './export';
import { SelectionAction, type SelectionActionProps } from './selection_action';
import type { SelectionActionConfig } from './selection_action_builder';

describe('parseSelectionActionsFromChildren', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with no children', () => {
    it('returns empty array for undefined children', () => {
      const actions = parseSelectionActionsFromChildren(undefined);
      expect(actions).toEqual([]);
    });

    it('returns empty array for null children', () => {
      const actions = parseSelectionActionsFromChildren(null);
      expect(actions).toEqual([]);
    });
  });

  describe('DeleteAction parsing', () => {
    it('parses DeleteAction correctly', () => {
      const children = React.createElement(DeleteAction, {});
      const actions = parseSelectionActionsFromChildren(children);
      expect(actions).toHaveLength(1);
      expect(actions[0].id).toBe('delete');
      expect(actions[0].config).toEqual({
        isVisible: undefined,
        isEnabled: undefined,
        'data-test-subj': undefined,
      });
    });

    it('parses DeleteAction with data-test-subj', () => {
      const children = React.createElement(DeleteAction, {
        'data-test-subj': 'customDeleteButton',
      });
      const actions = parseSelectionActionsFromChildren(children);
      expect(actions[0].config['data-test-subj']).toBe('customDeleteButton');
    });

    it('parses DeleteAction with isVisible and isEnabled', () => {
      const isVisible = jest.fn();
      const isEnabled = jest.fn();
      const children = React.createElement(DeleteAction, { isVisible, isEnabled });
      const actions = parseSelectionActionsFromChildren(children);
      expect(actions[0].config.isVisible).toBe(isVisible);
      expect(actions[0].config.isEnabled).toBe(isEnabled);
    });

    it('ignores duplicate DeleteAction and logs warning', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const children = [
        React.createElement(DeleteAction, { key: 'del1' }),
        React.createElement(DeleteAction, { key: 'del2' }),
      ];
      const actions = parseSelectionActionsFromChildren(children);
      expect(actions).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Duplicate Delete action'));
      consoleSpy.mockRestore();
    });
  });

  describe('ExportAction parsing', () => {
    it('parses ExportAction correctly', () => {
      const children = React.createElement(ExportAction, {});
      const actions = parseSelectionActionsFromChildren(children);
      expect(actions).toHaveLength(1);
      expect(actions[0].id).toBe('export');
      expect(actions[0].config).toEqual({
        isVisible: undefined,
        isEnabled: undefined,
        'data-test-subj': undefined,
      });
    });

    it('parses ExportAction with data-test-subj', () => {
      const children = React.createElement(ExportAction, {
        'data-test-subj': 'customExportButton',
      });
      const actions = parseSelectionActionsFromChildren(children);
      expect(actions[0].config['data-test-subj']).toBe('customExportButton');
    });

    it('ignores duplicate ExportAction and logs warning', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const children = [
        React.createElement(ExportAction, { key: 'exp1' }),
        React.createElement(ExportAction, { key: 'exp2' }),
      ];
      const actions = parseSelectionActionsFromChildren(children);
      expect(actions).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Duplicate Export action'));
      consoleSpy.mockRestore();
    });
  });

  describe('SelectionAction parsing', () => {
    it('parses SelectionAction with required props', () => {
      const handleSelect = jest.fn();
      const children = React.createElement(SelectionAction, {
        id: 'archive',
        label: 'Archive',
        onSelect: handleSelect,
      });
      const actions = parseSelectionActionsFromChildren(children);
      expect(actions).toHaveLength(1);
      expect(actions[0].id).toBe('archive');
      expect(actions[0].config).toEqual({
        id: 'archive',
        label: 'Archive',
        iconType: undefined,
        onSelect: handleSelect,
        isVisible: undefined,
        isEnabled: undefined,
        'data-test-subj': undefined,
      });
    });

    it('parses SelectionAction with all optional props', () => {
      const handleSelect = jest.fn();
      const isVisible = jest.fn();
      const isEnabled = jest.fn();
      const children = React.createElement(SelectionAction, {
        id: 'archive',
        label: 'Archive',
        iconType: 'folderClosed',
        onSelect: handleSelect,
        isVisible,
        isEnabled,
        'data-test-subj': 'archiveAction',
      });
      const actions = parseSelectionActionsFromChildren(children);
      expect(actions[0].config).toEqual({
        id: 'archive',
        label: 'Archive',
        iconType: 'folderClosed',
        onSelect: handleSelect,
        isVisible,
        isEnabled,
        'data-test-subj': 'archiveAction',
      });
    });

    it('ignores SelectionAction without id prop and logs warning', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      // Create a SelectionAction element without id prop.
      const children = React.createElement(SelectionAction, {
        label: 'No ID',
        onSelect: jest.fn(),
      } as unknown as SelectionActionProps);
      const actions = parseSelectionActionsFromChildren(children);
      expect(actions).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing required "id" prop')
      );
      consoleSpy.mockRestore();
    });

    it('ignores duplicate SelectionAction IDs and logs warning', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const children = [
        React.createElement(SelectionAction, {
          key: '1',
          id: 'archive',
          label: 'Archive 1',
          onSelect: jest.fn(),
        }),
        React.createElement(SelectionAction, {
          key: '2',
          id: 'archive',
          label: 'Archive 2',
          onSelect: jest.fn(),
        }),
      ];
      const actions = parseSelectionActionsFromChildren(children);
      expect(actions).toHaveLength(1);
      expect((actions[0].config as SelectionActionConfig).label).toBe('Archive 1');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate action ID: archive')
      );
      consoleSpy.mockRestore();
    });

    it('logs error for SelectionAction without onSelect handler', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      // Create a SelectionAction-like element without onSelect.
      const ActionWithoutHandler = (props: Record<string, unknown>) => null;
      (ActionWithoutHandler as unknown as { displayName: string }).displayName = 'SelectionAction';
      (
        ActionWithoutHandler as unknown as { __kbnSelectionActionRole: string }
      ).__kbnSelectionActionRole = 'action';
      const children = React.createElement(ActionWithoutHandler, {
        id: 'broken',
        label: 'Broken',
      });
      const actions = parseSelectionActionsFromChildren(children);
      expect(actions).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing required "onSelect" handler')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('multiple actions', () => {
    it('preserves order of multiple actions', () => {
      const children = [
        React.createElement(ExportAction, { key: '1' }),
        React.createElement(DeleteAction, { key: '2' }),
        React.createElement(SelectionAction, {
          key: '3',
          id: 'archive',
          label: 'Archive',
          onSelect: jest.fn(),
        }),
      ];
      const actions = parseSelectionActionsFromChildren(children);
      expect(actions).toHaveLength(3);
      expect(actions[0].id).toBe('export');
      expect(actions[1].id).toBe('delete');
      expect(actions[2].id).toBe('archive');
    });

    it('ignores non-action elements', () => {
      const children = [
        React.createElement('div', { key: 'div' }),
        React.createElement(DeleteAction, { key: 'delete' }),
        React.createElement('span', { key: 'span' }),
        React.createElement(SelectionAction, {
          key: 'action',
          id: 'archive',
          label: 'Archive',
          onSelect: jest.fn(),
        }),
      ];
      const actions = parseSelectionActionsFromChildren(children);
      expect(actions).toHaveLength(2);
      expect(actions[0].id).toBe('delete');
      expect(actions[1].id).toBe('archive');
    });

    it('ignores elements without the selection action role', () => {
      const NoRole = () => null;
      const children = [
        React.createElement(NoRole, { key: 'noop' }),
        React.createElement(DeleteAction, { key: 'delete' }),
      ];
      const actions = parseSelectionActionsFromChildren(children);
      expect(actions).toHaveLength(1);
    });
  });

  describe('isKnownActionId', () => {
    it('returns true for delete action', () => {
      expect(isKnownActionId('delete')).toBe(true);
    });

    it('returns true for export action', () => {
      expect(isKnownActionId('export')).toBe(true);
    });

    it('returns false for custom action id', () => {
      expect(isKnownActionId('archive')).toBe(false);
    });

    it('returns false for unknown id', () => {
      expect(isKnownActionId('unknown')).toBe(false);
    });
  });
});
