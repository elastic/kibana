/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { DatatableColumn } from '@kbn/expressions-plugin/common';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { FieldItemButton } from './field_item_button';

const bytesField = dataView.getFieldByName('bytes')!;
const scriptedField = dataView.getFieldByName('script date')!;
const conflictField = dataView.getFieldByName('custom_user_field')!;
const dataTestSubj = 'field-bytes-showDetails';

const commonProps = {
  field: bytesField,
  isEmpty: false,
  isSelected: false,
  isActive: false,
  fieldSearchHighlight: undefined,
  onClick: () => {},
};

describe('UnifiedFieldList <FieldItemButton />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders properly', async () => {
    await act(async () => {
      renderWithKibanaRenderContext(<FieldItemButton {...commonProps} />);
    });

    expect(screen.getByTestId('field-bytes')).toBeInTheDocument();
    expect(screen.getByTestId(dataTestSubj)).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const onClick = jest.fn();
    await act(async () => {
      renderWithKibanaRenderContext(<FieldItemButton {...commonProps} onClick={onClick} />);
    });

    const button = screen.getByTestId(dataTestSubj);
    await userEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should render with add to workspace button when onAddFieldToWorkspace is provided', async () => {
    const onAddFieldToWorkspace = jest.fn();

    await act(async () =>
      renderWithKibanaRenderContext(
        <FieldItemButton {...commonProps} onAddFieldToWorkspace={onAddFieldToWorkspace} />
      )
    );

    const addButton = screen.getByTestId('fieldToggle-bytes');
    expect(addButton).toHaveAttribute('aria-label', 'Add "bytes" field');
    await userEvent.click(addButton);

    expect(onAddFieldToWorkspace).toHaveBeenCalledWith(bytesField);
  });

  it('should render with remove from workspace button when onRemoveFieldFromWorkspace is provided and isSelected is true', async () => {
    const onRemoveFieldFromWorkspace = jest.fn();

    await act(async () =>
      renderWithKibanaRenderContext(
        <FieldItemButton
          {...commonProps}
          isSelected={true}
          onRemoveFieldFromWorkspace={onRemoveFieldFromWorkspace}
        />
      )
    );

    const removeButton = screen.getByTestId('fieldToggle-bytes');
    expect(removeButton).toHaveAttribute('aria-label', 'Remove "bytes" field');
    await userEvent.click(removeButton);

    expect(onRemoveFieldFromWorkspace).toHaveBeenCalledWith(bytesField);
  });

  it('should render correctly with drag icon', async () => {
    await act(async () =>
      renderWithKibanaRenderContext(<FieldItemButton {...commonProps} withDragIcon={true} />)
    );

    expect(screen.getByTestId('fieldItemButton-dragIcon')).toBeInTheDocument();
  });

  it('should highlight text when fieldSearchHighlight is provided', async () => {
    await act(async () =>
      renderWithKibanaRenderContext(<FieldItemButton {...commonProps} fieldSearchHighlight="by" />)
    );

    // Check for highlight elements
    const markElement = screen.getByText('by');
    expect(markElement.tagName).toBe('MARK');

    // Check that the full field name content is available
    const fieldNameElement = screen.getByTestId('field-bytes');
    expect(fieldNameElement).toHaveTextContent('bytes');
  });

  it('should render scripted field correctly', async () => {
    await act(async () =>
      renderWithKibanaRenderContext(<FieldItemButton {...commonProps} field={scriptedField} />)
    );

    expect(screen.getByTestId('field-script date')).toBeInTheDocument();
  });

  it('should render conflict field correctly', async () => {
    await act(async () =>
      renderWithKibanaRenderContext(<FieldItemButton {...commonProps} field={conflictField} />)
    );

    expect(screen.getByTestId('field-custom_user_field')).toBeInTheDocument();
  });

  it('renders properly for Records (Lens field)', async () => {
    await act(async () =>
      renderWithKibanaRenderContext(
        <FieldItemButton
          {...commonProps}
          field={
            new DataViewField({
              name: '___records___',
              customLabel: 'Records',
              type: 'document',
              searchable: false,
              aggregatable: true,
            })
          }
          fieldSearchHighlight="cor"
        />
      )
    );

    // Check that the Records field is rendered with custom label
    expect(screen.getByTestId('field-___records___')).toBeInTheDocument();
    expect(screen.getByText('Records')).toBeInTheDocument();

    // Check highlight is applied
    const highlightedText = screen.getByText('cor');
    expect(highlightedText.tagName).toBe('MARK');
  });

  it('renders properly for text-based column field', async () => {
    await act(async () =>
      renderWithKibanaRenderContext(
        <FieldItemButton<DatatableColumn>
          {...commonProps}
          field={{ id: 'test', name: 'agent', meta: { type: 'string' } }}
          fieldSearchHighlight="ag"
          getCustomFieldType={(f) => f.meta.type}
        />
      )
    );

    // Check that the field is rendered using the data-test-subj attribute
    const fieldElement = screen.getByTestId('field-agent');
    expect(fieldElement).toBeInTheDocument();

    // Check highlight is applied
    const highlightedText = screen.getByText('ag');
    expect(highlightedText.tagName).toBe('MARK');
  });

  it('renders properly for wildcard search', async () => {
    await act(async () =>
      renderWithKibanaRenderContext(
        <FieldItemButton {...commonProps} field={scriptedField} fieldSearchHighlight="sc*te" />
      )
    );

    expect(screen.getByTestId('field-script date')).toBeInTheDocument();

    const markElement = screen.getByTestId('field-script date').querySelector('mark');
    expect(markElement).toBeInTheDocument();
    expect(markElement).toHaveTextContent('script date');
  });

  it('renders properly for search with spaces', async () => {
    await act(async () =>
      renderWithKibanaRenderContext(
        <FieldItemButton {...commonProps} field={scriptedField} fieldSearchHighlight="sc te" />
      )
    );

    expect(screen.getByTestId('field-script date')).toBeInTheDocument();

    const markElement = screen.getByTestId('field-script date').querySelector('mark');
    expect(markElement).toBeInTheDocument();
    expect(markElement).toHaveTextContent('script date');
  });
});
