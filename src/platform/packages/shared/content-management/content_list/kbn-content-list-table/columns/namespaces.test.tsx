/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  CONTENT_LIST_TABLE_ROLE,
  CONTENT_LIST_TABLE_ID,
  isColumnComponent,
  isActionComponent,
  getColumnId,
  getActionId,
} from './namespaces';

describe('namespaces', () => {
  describe('constants', () => {
    it('exports CONTENT_LIST_TABLE_ROLE constant', () => {
      expect(CONTENT_LIST_TABLE_ROLE).toBe('__kbnContentListTableRole');
    });

    it('exports CONTENT_LIST_TABLE_ID constant', () => {
      expect(CONTENT_LIST_TABLE_ID).toBe('__kbnContentListTableId');
    });
  });

  describe('isColumnComponent', () => {
    it('returns true for element with column role', () => {
      const Component = () => null;
      (Component as unknown as Record<string, unknown>)[CONTENT_LIST_TABLE_ROLE] = 'column';

      const element = React.createElement(Component);

      expect(isColumnComponent(element)).toBe(true);
    });

    it('returns false for element with action role', () => {
      const Component = () => null;
      (Component as unknown as Record<string, unknown>)[CONTENT_LIST_TABLE_ROLE] = 'action';

      const element = React.createElement(Component);

      expect(isColumnComponent(element)).toBe(false);
    });

    it('returns false for element without role', () => {
      const Component = () => null;
      const element = React.createElement(Component);

      expect(isColumnComponent(element)).toBe(false);
    });

    it('falls back to displayName for Column', () => {
      const Column = () => null;
      Column.displayName = 'Column';

      const element = React.createElement(Column);

      expect(isColumnComponent(element)).toBe(true);
    });

    it('falls back to displayName for NameColumn', () => {
      const NameColumn = () => null;
      NameColumn.displayName = 'NameColumn';

      const element = React.createElement(NameColumn);

      expect(isColumnComponent(element)).toBe(true);
    });

    it('falls back to displayName for UpdatedAtColumn', () => {
      const UpdatedAtColumn = () => null;
      UpdatedAtColumn.displayName = 'UpdatedAtColumn';

      const element = React.createElement(UpdatedAtColumn);

      expect(isColumnComponent(element)).toBe(true);
    });

    it('falls back to displayName for CreatedByColumn', () => {
      const CreatedByColumn = () => null;
      CreatedByColumn.displayName = 'CreatedByColumn';

      const element = React.createElement(CreatedByColumn);

      expect(isColumnComponent(element)).toBe(true);
    });

    it('falls back to displayName for ActionsColumn', () => {
      const ActionsColumn = () => null;
      ActionsColumn.displayName = 'ActionsColumn';

      const element = React.createElement(ActionsColumn);

      expect(isColumnComponent(element)).toBe(true);
    });

    it('falls back to displayName for ExpanderColumn', () => {
      const ExpanderColumn = () => null;
      ExpanderColumn.displayName = 'ExpanderColumn';

      const element = React.createElement(ExpanderColumn);

      expect(isColumnComponent(element)).toBe(true);
    });

    it('returns false for non-React element', () => {
      expect(isColumnComponent(null)).toBe(false);
      expect(isColumnComponent(undefined)).toBe(false);
      expect(isColumnComponent('string')).toBe(false);
      expect(isColumnComponent(123)).toBe(false);
      expect(isColumnComponent({})).toBe(false);
    });

    it('returns false for element with unknown displayName', () => {
      const UnknownComponent = () => null;
      UnknownComponent.displayName = 'UnknownComponent';

      const element = React.createElement(UnknownComponent);

      expect(isColumnComponent(element)).toBe(false);
    });
  });

  describe('isActionComponent', () => {
    it('returns true for element with action role', () => {
      const Component = () => null;
      (Component as unknown as Record<string, unknown>)[CONTENT_LIST_TABLE_ROLE] = 'action';

      const element = React.createElement(Component);

      expect(isActionComponent(element)).toBe(true);
    });

    it('returns false for element with column role', () => {
      const Component = () => null;
      (Component as unknown as Record<string, unknown>)[CONTENT_LIST_TABLE_ROLE] = 'column';

      const element = React.createElement(Component);

      expect(isActionComponent(element)).toBe(false);
    });

    it('falls back to displayName for Action', () => {
      const Action = () => null;
      Action.displayName = 'Action';

      const element = React.createElement(Action);

      expect(isActionComponent(element)).toBe(true);
    });

    it('falls back to displayName for CustomAction', () => {
      const CustomAction = () => null;
      CustomAction.displayName = 'CustomAction';

      const element = React.createElement(CustomAction);

      expect(isActionComponent(element)).toBe(true);
    });

    it('falls back to displayName for ViewDetailsAction', () => {
      const ViewDetailsAction = () => null;
      ViewDetailsAction.displayName = 'ViewDetailsAction';

      const element = React.createElement(ViewDetailsAction);

      expect(isActionComponent(element)).toBe(true);
    });

    it('falls back to displayName for EditAction', () => {
      const EditAction = () => null;
      EditAction.displayName = 'EditAction';

      const element = React.createElement(EditAction);

      expect(isActionComponent(element)).toBe(true);
    });

    it('falls back to displayName for DeleteAction', () => {
      const DeleteAction = () => null;
      DeleteAction.displayName = 'DeleteAction';

      const element = React.createElement(DeleteAction);

      expect(isActionComponent(element)).toBe(true);
    });

    it('falls back to displayName for DuplicateAction', () => {
      const DuplicateAction = () => null;
      DuplicateAction.displayName = 'DuplicateAction';

      const element = React.createElement(DuplicateAction);

      expect(isActionComponent(element)).toBe(true);
    });

    it('falls back to displayName for ExportAction', () => {
      const ExportAction = () => null;
      ExportAction.displayName = 'ExportAction';

      const element = React.createElement(ExportAction);

      expect(isActionComponent(element)).toBe(true);
    });

    it('returns false for non-React element', () => {
      expect(isActionComponent(null)).toBe(false);
      expect(isActionComponent(undefined)).toBe(false);
    });
  });

  describe('getColumnId', () => {
    it('returns id from props when provided', () => {
      const Component = () => null;
      (Component as unknown as Record<string, unknown>)[CONTENT_LIST_TABLE_ROLE] = 'column';

      const element = React.createElement(Component, { id: 'custom-id' });

      expect(getColumnId(element)).toBe('custom-id');
    });

    it('returns id from static property', () => {
      const Component = () => null;
      (Component as unknown as Record<string, unknown>)[CONTENT_LIST_TABLE_ROLE] = 'column';
      (Component as unknown as Record<string, unknown>)[CONTENT_LIST_TABLE_ID] = 'static-id';

      const element = React.createElement(Component);

      expect(getColumnId(element)).toBe('static-id');
    });

    it('prefers props.id over static property', () => {
      const Component = () => null;
      (Component as unknown as Record<string, unknown>)[CONTENT_LIST_TABLE_ROLE] = 'column';
      (Component as unknown as Record<string, unknown>)[CONTENT_LIST_TABLE_ID] = 'static-id';

      const element = React.createElement(Component, { id: 'props-id' });

      expect(getColumnId(element)).toBe('props-id');
    });

    it('falls back to displayName mapping for NameColumn', () => {
      const NameColumn = () => null;
      NameColumn.displayName = 'NameColumn';

      const element = React.createElement(NameColumn);

      expect(getColumnId(element)).toBe('name');
    });

    it('falls back to displayName mapping for UpdatedAtColumn', () => {
      const UpdatedAtColumn = () => null;
      UpdatedAtColumn.displayName = 'UpdatedAtColumn';

      const element = React.createElement(UpdatedAtColumn);

      expect(getColumnId(element)).toBe('updatedAt');
    });

    it('falls back to displayName mapping for CreatedByColumn', () => {
      const CreatedByColumn = () => null;
      CreatedByColumn.displayName = 'CreatedByColumn';

      const element = React.createElement(CreatedByColumn);

      expect(getColumnId(element)).toBe('createdBy');
    });

    it('falls back to displayName mapping for ActionsColumn', () => {
      const ActionsColumn = () => null;
      ActionsColumn.displayName = 'ActionsColumn';

      const element = React.createElement(ActionsColumn);

      expect(getColumnId(element)).toBe('actions');
    });

    it('falls back to displayName mapping for ExpanderColumn', () => {
      const ExpanderColumn = () => null;
      ExpanderColumn.displayName = 'ExpanderColumn';

      const element = React.createElement(ExpanderColumn);

      expect(getColumnId(element)).toBe('expander');
    });

    it('returns undefined for non-column element', () => {
      const element = React.createElement('div');

      expect(getColumnId(element)).toBeUndefined();
    });

    it('returns undefined for non-React element', () => {
      expect(getColumnId(null)).toBeUndefined();
      expect(getColumnId('string')).toBeUndefined();
    });
  });

  describe('getActionId', () => {
    it('returns id from props when provided', () => {
      const Component = () => null;
      (Component as unknown as Record<string, unknown>)[CONTENT_LIST_TABLE_ROLE] = 'action';

      const element = React.createElement(Component, { id: 'custom-action' });

      expect(getActionId(element)).toBe('custom-action');
    });

    it('returns id from static property', () => {
      const Component = () => null;
      (Component as unknown as Record<string, unknown>)[CONTENT_LIST_TABLE_ROLE] = 'action';
      (Component as unknown as Record<string, unknown>)[CONTENT_LIST_TABLE_ID] = 'static-action';

      const element = React.createElement(Component);

      expect(getActionId(element)).toBe('static-action');
    });

    it('falls back to displayName mapping for ViewDetailsAction', () => {
      const ViewDetailsAction = () => null;
      ViewDetailsAction.displayName = 'ViewDetailsAction';

      const element = React.createElement(ViewDetailsAction);

      expect(getActionId(element)).toBe('viewDetails');
    });

    it('falls back to displayName mapping for EditAction', () => {
      const EditAction = () => null;
      EditAction.displayName = 'EditAction';

      const element = React.createElement(EditAction);

      expect(getActionId(element)).toBe('edit');
    });

    it('falls back to displayName mapping for DeleteAction', () => {
      const DeleteAction = () => null;
      DeleteAction.displayName = 'DeleteAction';

      const element = React.createElement(DeleteAction);

      expect(getActionId(element)).toBe('delete');
    });

    it('falls back to displayName mapping for DuplicateAction', () => {
      const DuplicateAction = () => null;
      DuplicateAction.displayName = 'DuplicateAction';

      const element = React.createElement(DuplicateAction);

      expect(getActionId(element)).toBe('duplicate');
    });

    it('falls back to displayName mapping for ExportAction', () => {
      const ExportAction = () => null;
      ExportAction.displayName = 'ExportAction';

      const element = React.createElement(ExportAction);

      expect(getActionId(element)).toBe('export');
    });

    it('returns undefined for non-action element', () => {
      const element = React.createElement('div');

      expect(getActionId(element)).toBeUndefined();
    });

    it('returns undefined for column element', () => {
      const Component = () => null;
      (Component as unknown as Record<string, unknown>)[CONTENT_LIST_TABLE_ROLE] = 'column';

      const element = React.createElement(Component);

      expect(getActionId(element)).toBeUndefined();
    });
  });
});
