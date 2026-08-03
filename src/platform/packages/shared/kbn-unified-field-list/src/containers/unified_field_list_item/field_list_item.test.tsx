/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UnifiedFieldListItemProps } from './field_list_item';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { createStateService } from '../services/state_service';
import { DataViewField } from '@kbn/data-views-plugin/public';
import { EuiThemeProvider } from '@elastic/eui';
import { getServicesMock } from '../../../__mocks__/services.mock';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { stubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { ReorderProvider, RootDragDropProvider } from '@kbn/dom-drag-drop';
import { UnifiedFieldListItem } from './field_list_item';

jest.mock('../../services/field_stats', () => ({
  loadFieldStats: jest.fn().mockResolvedValue({
    totalDocuments: 1624,
    sampledDocuments: 1624,
    sampledValues: 3248,
    topValues: {
      buckets: [
        {
          count: 2042,
          key: 'osx',
        },
        {
          count: 1206,
          key: 'winx',
        },
      ],
    },
  }),
}));

const renderComponent = async ({
  canFilter = true,
  field,
  isBreakdownSupported = true,
  selected = false,
}: {
  canFilter?: boolean;
  field?: DataViewField;
  isBreakdownSupported?: boolean;
  selected?: boolean;
}) => {
  const finalField =
    field ??
    new DataViewField({
      aggregatable: true,
      count: 10,
      esTypes: ['long'],
      name: 'bytes',
      readFromDocValues: true,
      scripted: false,
      searchable: true,
      type: 'number',
    });

  const dataView = stubDataView;
  dataView.toSpec = () => ({});

  const stateService = createStateService({
    options: {
      originatingApp: 'test',
    },
  });

  const props: UnifiedFieldListItemProps = {
    dataView: stubDataView,
    field: finalField,
    groupIndex: 1,
    isEmpty: false,
    isSelected: selected,
    itemIndex: 0,
    onAddFieldToWorkspace: jest.fn(),
    onEditField: jest.fn(),
    onRemoveFieldFromWorkspace: jest.fn(),
    searchMode: 'documents',
    services: getServicesMock(),
    size: 'xs',
    stateService,
    workspaceSelectedFieldNames: [],
    ...(canFilter && { onAddFilter: jest.fn() }),
    ...(isBreakdownSupported && { onAddBreakdownField: jest.fn() }),
  };

  const user = userEvent.setup();

  renderWithKibanaRenderContext(
    <EuiThemeProvider>
      <UnifiedFieldListItem {...props} />
    </EuiThemeProvider>
  );

  return { field: finalField, props, user };
};

const renderReorderableList = ({
  extraFieldWithoutGroup = false,
}: {
  extraFieldWithoutGroup?: boolean;
} = {}) => {
  const fields = ['bytes', 'extension', 'machine.os.raw'].map(
    (name) =>
      new DataViewField({
        aggregatable: true,
        esTypes: ['keyword'],
        name,
        searchable: true,
        type: 'string',
      })
  );
  const extraField = new DataViewField({
    aggregatable: true,
    esTypes: ['keyword'],
    name: 'clientip',
    searchable: true,
    type: 'string',
  });
  const reorderableGroup = fields.map((field) => ({ id: field.name }));
  const onReorderField = jest.fn();

  const dataView = stubDataView;
  dataView.toSpec = () => ({});

  const stateService = createStateService({
    options: {
      originatingApp: 'test',
    },
  });

  const commonProps: Omit<UnifiedFieldListItemProps, 'field' | 'itemIndex' | 'isSelected'> = {
    dataView: stubDataView,
    groupIndex: 1,
    isEmpty: false,
    onAddFieldToWorkspace: jest.fn(),
    onRemoveFieldFromWorkspace: jest.fn(),
    searchMode: 'documents',
    services: getServicesMock(),
    size: 'xs',
    stateService,
    workspaceSelectedFieldNames: fields.map((field) => field.name),
  };

  renderWithKibanaRenderContext(
    <EuiThemeProvider>
      <RootDragDropProvider>
        <ReorderProvider>
          {fields.map((field, itemIndex) => (
            <UnifiedFieldListItem
              key={field.name}
              {...commonProps}
              field={field}
              itemIndex={itemIndex}
              isSelected
              reorderableGroup={reorderableGroup}
              onReorderField={onReorderField}
            />
          ))}
        </ReorderProvider>
        {extraFieldWithoutGroup && (
          <UnifiedFieldListItem
            {...commonProps}
            field={extraField}
            itemIndex={0}
            isSelected={false}
          />
        )}
      </RootDragDropProvider>
    </EuiThemeProvider>
  );

  return { fields, onReorderField };
};

const mockDataTransfer = () => ({
  getData: jest.fn(() => ''),
  setData: jest.fn(),
});

describe('UnifiedFieldListItem', () => {
  it('should allow selecting fields', async () => {
    const { props, user } = await renderComponent({});

    await user.click(screen.getByRole('button', { name: 'Add "bytes" field' }));

    expect(props.onAddFieldToWorkspace).toHaveBeenCalledWith(props.field);
  });

  it('should allow deselecting fields', async () => {
    const { props, user } = await renderComponent({ selected: true });

    await user.click(screen.getByRole('button', { name: 'Remove "bytes" field' }));

    expect(props.onRemoveFieldFromWorkspace).toHaveBeenCalledWith(props.field);
  });

  it('displays warning for conflicting fields', async () => {
    const field = new DataViewField({
      aggregatable: true,
      esTypes: ['integer', 'text'],
      name: 'troubled_field',
      readFromDocValues: false,
      searchable: true,
      type: 'conflict',
    });

    await renderComponent({
      field,
      selected: true,
    });

    expect(await screen.findByText('Conflict')).toBeVisible();
    expect(screen.getByText('troubled_field')).toBeVisible();
    expect(screen.getByText('Info')).toBeVisible();
  });

  it('should not enable the popover if onAddFilter is not provided', async () => {
    const field = new DataViewField({
      aggregatable: true,
      esTypes: ['_source'],
      name: '_source',
      readFromDocValues: true,
      searchable: true,
      type: '_source',
    });

    await renderComponent({
      canFilter: false,
      field,
      selected: true,
    });

    await waitFor(() => {
      expect(screen.getAllByText('_source')).toHaveLength(2);
    });
    expect(
      screen.queryByRole('button', { name: 'Preview _source: _source' })
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('fieldStats-title')).not.toBeInTheDocument();
  });

  it('should not show addBreakdownField action button if not supported', async () => {
    const field = new DataViewField({
      aggregatable: true,
      esTypes: ['keyword'],
      name: 'extension.keyword',
      searchable: true,
      type: 'string',
    });

    const { user } = await renderComponent({
      field,
      isBreakdownSupported: false,
    });

    await user.click(screen.getByText('extension.keyword'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'extension.keyword' })).toBeVisible();
    });

    expect(screen.queryByRole('button', { name: 'Add breakdown' })).not.toBeInTheDocument();
  });

  it('should request field stats', async () => {
    const field = new DataViewField({
      aggregatable: true,
      esTypes: ['keyword'],
      name: 'machine.os.raw',
      searchable: true,
      type: 'string',
    });

    const { user } = await renderComponent({ canFilter: true, field });

    await user.click(screen.getByText('machine.os.raw'));

    await waitFor(() => {
      expect(screen.getByText('Top values')).toBeVisible();
    });

    expect(screen.getByRole('progressbar', { name: 'osx' })).toHaveAttribute(
      'aria-valuetext',
      '62.9%'
    );
    expect(screen.getByRole('progressbar', { name: 'winx' })).toHaveAttribute(
      'aria-valuetext',
      '37.1%'
    );
    expect(screen.getAllByRole('progressbar')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /machine\.os\.raw: "(osx|winx)"/ })).toHaveLength(
      4
    );
  });

  it('should include popover actions', async () => {
    const field = new DataViewField({
      aggregatable: true,
      esTypes: ['keyword'],
      name: 'extension.keyword',
      searchable: true,
      type: 'string',
    });

    const { props, user } = await renderComponent({ field, canFilter: true });

    await user.click(screen.getByText('extension.keyword'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'extension.keyword' })).toBeVisible();
    });

    const popover = within(screen.getByRole('dialog'));

    expect(popover.getByRole('button', { name: 'Add breakdown' })).toBeVisible();
    expect(popover.getByRole('button', { name: 'Add "extension.keyword" field' })).toBeVisible();
    expect(popover.getByRole('button', { name: 'Filter for field present' })).toBeVisible();
    expect(popover.getByRole('button', { name: 'Edit data view field' })).toBeVisible();
    expect(
      popover.queryByRole('button', { name: 'Delete data view field' })
    ).not.toBeInTheDocument();

    await user.click(popover.getByRole('button', { name: 'Add "extension.keyword" field' }));

    expect(props.onAddFieldToWorkspace).toHaveBeenCalledWith(field);

    await waitFor(() => {
      expect(screen.queryByTestId('fieldStats-title')).not.toBeInTheDocument();
    });
  });

  it('should not include + action for selected fields', async () => {
    const field = new DataViewField({
      aggregatable: true,
      esTypes: ['keyword'],
      name: 'extension.keyword',
      searchable: true,
      type: 'string',
    });

    const { user } = await renderComponent({
      canFilter: true,
      field,
      selected: true,
    });

    await user.click(screen.getByText('extension.keyword'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'extension.keyword' })).toBeVisible();
    });

    expect(
      screen.queryByRole('button', { name: 'Add "extension.keyword" field' })
    ).not.toBeInTheDocument();
  });

  describe('reordering', () => {
    it('should invoke onReorderField when dropping a dragged field onto another field of the group', async () => {
      const { onReorderField } = renderReorderableList();

      // without an active drag, no reorder drop targets should be rendered
      expect(
        screen.queryByTestId('unifiedFieldListItemDnD-reorderTarget-extension')
      ).not.toBeInTheDocument();

      fireEvent.dragStart(screen.getByTestId('unifiedFieldListItemDnD-bytes'), {
        dataTransfer: mockDataTransfer(),
      });

      // drop targets appear once a member of the group is being dragged
      await waitFor(() => {
        expect(
          screen.getByTestId('unifiedFieldListItemDnD-reorderTarget-machine.os.raw')
        ).toBeInTheDocument();
      });

      fireEvent.drop(
        within(screen.getByTestId('unifiedFieldListItemDnD-machine.os.raw')).getByTestId(
          'domDragDrop-reorderableDropLayer'
        ),
        { dataTransfer: mockDataTransfer() }
      );

      expect(onReorderField).toHaveBeenCalledTimes(1);
      expect(onReorderField).toHaveBeenCalledWith('bytes', 'machine.os.raw');
    });

    it('should not offer a reorder drop target on the dragged field itself', async () => {
      renderReorderableList();

      fireEvent.dragStart(screen.getByTestId('unifiedFieldListItemDnD-bytes'), {
        dataTransfer: mockDataTransfer(),
      });

      await waitFor(() => {
        expect(
          screen.getByTestId('unifiedFieldListItemDnD-reorderTarget-extension')
        ).toBeInTheDocument();
      });

      // the dragged item itself must not render a drop layer to reorder onto
      expect(
        within(screen.getByTestId('unifiedFieldListItemDnD-bytes')).queryByTestId(
          'domDragDrop-reorderableDropLayer'
        )
      ).not.toBeInTheDocument();
      // while the other items of the group do
      expect(screen.getAllByTestId('domDragDrop-reorderableDropLayer')).toHaveLength(2);
    });

    it('should not activate reorder drop targets when dragging a field from outside the group', async () => {
      const { onReorderField } = renderReorderableList({ extraFieldWithoutGroup: true });

      fireEvent.dragStart(screen.getByTestId('unifiedFieldListItemDnD-clientip'), {
        dataTransfer: mockDataTransfer(),
      });

      await waitFor(() => {
        expect(screen.getByTestId('unifiedFieldListItemDnD-clientip')).toHaveClass(
          'domDraggable_active--copy'
        );
      });

      expect(
        screen.queryByTestId('unifiedFieldListItemDnD-reorderTarget-bytes')
      ).not.toBeInTheDocument();
      expect(screen.queryAllByTestId('domDragDrop-reorderableDropLayer')).toHaveLength(0);
      expect(onReorderField).not.toHaveBeenCalled();
    });
  });
});
