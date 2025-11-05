/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { FieldPopoverHeader } from './field_popover_header';

describe('UnifiedFieldList <FieldPopoverHeader />', () => {
  it('should render correctly without actions', async () => {
    const mockClose = jest.fn();
    const fieldName = 'extension';
    renderWithI18n(
      <FieldPopoverHeader
        field={dataView.fields.find((field) => field.name === fieldName)!}
        closePopover={mockClose}
      />
    );

    expect(await screen.findByText(fieldName)).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should render correctly with all actions', async () => {
    const mockClose = jest.fn();
    const fieldName = 'extension.keyword';
    const field = dataView.fields.find((f) => f.name === fieldName)!;
    jest.spyOn(field, 'isRuntimeField', 'get').mockImplementation(() => true);
    renderWithI18n(
      <FieldPopoverHeader
        field={field}
        closePopover={mockClose}
        onAddFieldToWorkspace={jest.fn()}
        onAddBreakdownField={jest.fn()}
        onAddFilter={jest.fn()}
        onEditField={jest.fn()}
        onDeleteField={jest.fn()}
      />
    );

    expect(screen.getByText(fieldName)).toBeVisible();
    expect(screen.getByTestId(`fieldPopoverHeader_addBreakdownField-${fieldName}`)).toBeVisible();
    expect(screen.getByTestId(`fieldPopoverHeader_addField-${fieldName}`)).toBeVisible();
    expect(screen.getByTestId(`fieldPopoverHeader_addExistsFilter-${fieldName}`)).toBeVisible();
    expect(screen.getByTestId(`fieldPopoverHeader_editField-${fieldName}`)).toBeVisible();
    expect(screen.getByTestId(`fieldPopoverHeader_deleteField-${fieldName}`)).toBeVisible();
    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('should correctly handle add-breakdown-field action', async () => {
    const mockClose = jest.fn();
    const mockAddBreakdownField = jest.fn();
    const fieldName = 'extension';
    const field = dataView.fields.find((f) => f.name === fieldName)!;
    renderWithI18n(
      <FieldPopoverHeader
        field={field}
        closePopover={mockClose}
        onAddBreakdownField={mockAddBreakdownField}
      />
    );

    await userEvent.click(screen.getByTestId(`fieldPopoverHeader_addBreakdownField-${fieldName}`));

    expect(mockClose).toHaveBeenCalled();
    expect(mockAddBreakdownField).toHaveBeenCalledWith(field);
  });

  it('should correctly handle add-field action', async () => {
    const mockClose = jest.fn();
    const mockAddField = jest.fn();
    const fieldName = 'extension';
    const field = dataView.fields.find((f) => f.name === fieldName)!;
    renderWithI18n(
      <FieldPopoverHeader
        field={field}
        closePopover={mockClose}
        onAddFieldToWorkspace={mockAddField}
      />
    );

    await userEvent.click(screen.getByTestId(`fieldPopoverHeader_addField-${fieldName}`));

    expect(mockClose).toHaveBeenCalled();
    expect(mockAddField).toHaveBeenCalledWith(field);
  });

  it('should correctly handle add-exists-filter action', async () => {
    const mockClose = jest.fn();
    const mockAddFilter = jest.fn();
    const fieldName = 'extension';
    const field = dataView.fields.find((f) => f.name === fieldName)!;

    // available
    renderWithI18n(
      <FieldPopoverHeader field={field} closePopover={mockClose} onAddFilter={mockAddFilter} />
    );
    await userEvent.click(screen.getByTestId(`fieldPopoverHeader_addExistsFilter-${fieldName}`));
    expect(mockClose).toHaveBeenCalled();
    expect(mockAddFilter).toHaveBeenCalledWith('_exists_', fieldName, '+');
  });

  it('should correctly handle hidden add-exists-filter action', async () => {
    const mockClose = jest.fn();
    const mockAddFilter = jest.fn();
    const fieldName = 'extension';
    const field = dataView.fields.find((f) => f.name === fieldName)!;

    jest.spyOn(field, 'filterable', 'get').mockImplementation(() => false);
    renderWithI18n(
      <FieldPopoverHeader field={field} closePopover={mockClose} onAddFilter={mockAddFilter} />
    );
    expect(
      screen.queryByTestId(`fieldPopoverHeader_addExistsFilter-${fieldName}`)
    ).not.toBeInTheDocument();
  });

  it('should correctly handle edit-field action', async () => {
    const mockClose = jest.fn();
    const mockEditField = jest.fn();
    const fieldName = 'extension';
    const field = dataView.fields.find((f) => f.name === fieldName)!;

    // available
    jest.spyOn(field, 'isRuntimeField', 'get').mockImplementation(() => true);
    renderWithI18n(
      <FieldPopoverHeader field={field} closePopover={mockClose} onEditField={mockEditField} />
    );
    await userEvent.click(screen.getByTestId(`fieldPopoverHeader_editField-${fieldName}`));
    expect(mockClose).toHaveBeenCalled();
    expect(mockEditField).toHaveBeenCalledWith(fieldName);
  });

  it('should correctly handle hidden edit-field action', async () => {
    const mockClose = jest.fn();
    const mockEditField = jest.fn();
    const fieldName = 'extension';
    const field = dataView.fields.find((f) => f.name === fieldName)!;

    jest.spyOn(field, 'isRuntimeField', 'get').mockImplementation(() => false);
    jest.spyOn(field, 'type', 'get').mockImplementation(() => 'unknown');
    renderWithI18n(
      <FieldPopoverHeader field={field} closePopover={mockClose} onEditField={mockEditField} />
    );
    expect(
      screen.queryByTestId(`fieldPopoverHeader_editField-${fieldName}`)
    ).not.toBeInTheDocument();
  });

  it('should correctly handle delete-field action', async () => {
    const mockClose = jest.fn();
    const mockDeleteField = jest.fn();
    const fieldName = 'extension';
    const field = dataView.fields.find((f) => f.name === fieldName)!;

    // available
    jest.spyOn(field, 'isRuntimeField', 'get').mockImplementation(() => true);
    renderWithI18n(
      <FieldPopoverHeader field={field} closePopover={mockClose} onDeleteField={mockDeleteField} />
    );
    await userEvent.click(screen.getByTestId(`fieldPopoverHeader_deleteField-${fieldName}`));
    expect(mockClose).toHaveBeenCalled();
    expect(mockDeleteField).toHaveBeenCalledWith(fieldName);
  });

  it('should correctly handle hidden delete-field action', async () => {
    const mockClose = jest.fn();
    const mockDeleteField = jest.fn();
    const fieldName = 'extension';
    const field = dataView.fields.find((f) => f.name === fieldName)!;

    jest.spyOn(field, 'isRuntimeField', 'get').mockImplementation(() => false);
    renderWithI18n(
      <FieldPopoverHeader field={field} closePopover={mockClose} onDeleteField={mockDeleteField} />
    );
    expect(
      screen.queryByTestId(`fieldPopoverHeader_deleteField-${fieldName}`)
    ).not.toBeInTheDocument();
  });

  it('should render correctly the field type icon on the header', () => {
    const fieldName = 'extension';
    const field = dataView.fields.find((f) => f.name === fieldName)!;
    renderWithI18n(<FieldPopoverHeader field={field} closePopover={jest.fn()} />);

    expect(screen.getByTestId(`fieldPopoverHeader_icon-${fieldName}`)).toBeVisible();
  });

  it('should handle getCustomFieldType', () => {
    const mockGetCustomFieldType = jest.fn().mockReturnValue('custom');
    const fieldName = 'extension';
    const field = dataView.fields.find((f) => f.name === fieldName)!;
    renderWithI18n(
      <FieldPopoverHeader
        field={field}
        closePopover={jest.fn()}
        getCustomFieldType={mockGetCustomFieldType}
      />
    );

    expect(mockGetCustomFieldType).toHaveBeenCalledWith(field);
    expect(screen.getByTitle('custom')).toBeVisible();
  });
});
