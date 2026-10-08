/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { RootDragDropProvider } from '@kbn/dom-drag-drop';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { nextTick } from '@kbn/test-jest-helpers';
import { getServicesMock } from '../../../__mocks__/services.mock';
import * as ExistenceApi from '../../hooks/use_existing_fields';
import { ExistenceFetchStatus } from '../../types';
import { createStateService } from '../services/state_service';
import { UnifiedFieldListSidebar, type UnifiedFieldListSidebarProps } from './field_list_sidebar';

// a stable reader, as its identity is part of effect dependencies
const existingFieldsReader: ExistenceApi.ExistingFieldsReader = {
  hasFieldData: () => true,
  getFieldsExistenceStatus: () => ExistenceFetchStatus.succeeded,
  isFieldsExistenceInfoUnavailable: () => false,
  getNewFields: () => [],
};

// DataTransfer is not implemented in jsdom
const dataTransfer = {
  setData: jest.fn(),
  getData: jest.fn(),
};

const getSelectedFieldNames = () =>
  Array.from(
    screen.getByTestId('fieldListGroupedSelectedFields').querySelectorAll('li[data-attr-field]')
  ).map((item) => item.getAttribute('data-attr-field'));

const getSelectedFieldItem = (fieldName: string) => {
  const item = screen
    .getByTestId('fieldListGroupedSelectedFields')
    .querySelector(`li[data-attr-field="${fieldName}"]`);
  if (!(item instanceof HTMLElement)) {
    throw new Error(`Selected field "${fieldName}" was not found`);
  }
  return item;
};

const startDragging = async (fieldName: string, expectedDragType: 'move' | 'copy') => {
  const draggable = within(getSelectedFieldItem(fieldName)).getByTestId(
    `unifiedFieldListItemDnD-${fieldName}`
  );
  fireEvent.dragStart(draggable, { dataTransfer });
  // the drag state is set asynchronously
  await waitFor(() => {
    expect(draggable).toHaveClass(`domDraggable_active--${expectedDragType}`);
  });
};

const dropOnto = (fieldName: string) => {
  fireEvent.drop(
    within(getSelectedFieldItem(fieldName)).getByTestId('domDragDrop-reorderableDropLayer')
  );
};

describe('UnifiedFieldListSidebar', () => {
  beforeEach(() => {
    jest.spyOn(ExistenceApi, 'useExistingFieldsReader').mockReturnValue(existingFieldsReader);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const getProps = (
    overrides: Partial<UnifiedFieldListSidebarProps> = {}
  ): UnifiedFieldListSidebarProps => {
    const services = getServicesMock();
    services.dataViews.get = jest.fn().mockResolvedValue(dataView);

    return {
      stateService: createStateService({ options: { originatingApp: 'test' } }),
      services,
      searchMode: 'documents',
      dataView,
      allFields: dataView.fields,
      workspaceSelectedFieldNames: ['extension', 'bytes', 'machine.os'],
      isProcessing: false,
      isAffectedByGlobalFilter: false,
      buttonAddFieldVariant: 'primary',
      onAddFieldToWorkspace: jest.fn(),
      onRemoveFieldFromWorkspace: jest.fn(),
      onMoveFieldInWorkspace: jest.fn(),
      onEditField: undefined,
      onDeleteField: undefined,
      ...overrides,
    };
  };

  const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <I18nProvider>
      <EuiThemeProvider>
        <RootDragDropProvider>{children}</RootDragDropProvider>
      </EuiThemeProvider>
    </I18nProvider>
  );

  const renderSidebar = async (overrides: Partial<UnifiedFieldListSidebarProps> = {}) => {
    const props = getProps(overrides);
    const user = userEvent.setup();
    const { rerender } = render(<UnifiedFieldListSidebar {...props} />, { wrapper: Wrapper });

    // let the data view resolve
    await act(async () => {
      await nextTick();
    });

    await waitFor(() => {
      expect(screen.getByTestId('fieldListGroupedSelectedFields')).toBeInTheDocument();
    });

    return {
      props,
      user,
      rerender: (nextProps: Partial<UnifiedFieldListSidebarProps>) =>
        rerender(<UnifiedFieldListSidebar {...props} {...nextProps} />),
    };
  };

  describe('reordering selected fields', () => {
    it('should show the new order right away and update the workspace afterwards', async () => {
      const { props, rerender } = await renderSidebar();

      expect(getSelectedFieldNames()).toEqual(['extension', 'bytes', 'machine.os']);
      expect(screen.getByTestId('domDragDrop-reorderableGroup')).toBeInTheDocument();

      await startDragging('extension', 'move');
      dropOnto('machine.os');

      // the sidebar is updated synchronously, the workspace after the next paint
      expect(getSelectedFieldNames()).toEqual(['bytes', 'machine.os', 'extension']);
      expect(props.onMoveFieldInWorkspace).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(props.onMoveFieldInWorkspace).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'extension' }),
          2
        );
      });

      // once the workspace caught up, the order stays the same and the fields are reorderable again
      rerender({ workspaceSelectedFieldNames: ['bytes', 'machine.os', 'extension'] });
      expect(getSelectedFieldNames()).toEqual(['bytes', 'machine.os', 'extension']);

      await startDragging('extension', 'move');
      dropOnto('bytes');
      expect(getSelectedFieldNames()).toEqual(['extension', 'bytes', 'machine.os']);
      await waitFor(() => {
        expect(props.onMoveFieldInWorkspace).toHaveBeenLastCalledWith(
          expect.objectContaining({ name: 'extension' }),
          0
        );
      });
    });

    it('should drop the optimistic order when the workspace changes in a different way', async () => {
      const { rerender } = await renderSidebar();

      await startDragging('bytes', 'move');
      dropOnto('extension');
      expect(getSelectedFieldNames()).toEqual(['bytes', 'extension', 'machine.os']);

      rerender({ workspaceSelectedFieldNames: ['extension', 'bytes', 'machine.os', 'ip'] });

      expect(getSelectedFieldNames()).toEqual(['extension', 'bytes', 'machine.os', 'ip']);
    });

    it('should not be reorderable while the field list is filtered by name', async () => {
      const { user } = await renderSidebar({
        workspaceSelectedFieldNames: ['extension', 'bytes', 'machine.os', 'ip'],
      });

      await user.type(screen.getByTestId('fieldListFiltersFieldSearch'), 'e');

      await waitFor(() => {
        expect(getSelectedFieldNames()).toEqual(['extension', 'bytes', 'machine.os']);
      });

      await startDragging('extension', 'copy');
      expect(screen.queryByTestId('domDragDrop-reorderableDropLayer')).not.toBeInTheDocument();
    });

    it.each<[string, Partial<UnifiedFieldListSidebarProps>]>([
      ['without a workspace handler', { onMoveFieldInWorkspace: undefined }],
      ['with a single selected field', { workspaceSelectedFieldNames: ['extension'] }],
      [
        'when selected fields are determined by a custom filter',
        { onSelectedFieldFilter: (field) => ['extension', 'bytes'].includes(field.name) },
      ],
    ])('should not be reorderable %s', async (_, overrides) => {
      await renderSidebar(overrides);

      await startDragging('extension', 'copy');
      expect(screen.queryByTestId('domDragDrop-reorderableDropLayer')).not.toBeInTheDocument();
    });

    it('should not be draggable when the action buttons are always shown', async () => {
      await renderSidebar({ alwaysShowActionButton: true });

      expect(screen.queryByTestId('domDragDrop-reorderableGroup')).not.toBeInTheDocument();
      expect(screen.queryByTestId('unifiedFieldListItemDnD-extension')).not.toBeInTheDocument();
    });
  });
});
