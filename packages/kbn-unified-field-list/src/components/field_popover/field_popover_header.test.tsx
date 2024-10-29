/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonIcon } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { FieldPopoverHeader } from './field_popover_header';

describe('UnifiedFieldList <FieldPopoverHeader />', () => {
  it('should render correctly without actions', async () => {
    const mockClose = jest.fn();
    const fieldName = 'extension';
    const wrapper = mountWithIntl(
      <FieldPopoverHeader
        field={dataView.fields.find((field) => field.name === fieldName)!}
        closePopover={mockClose}
      />
    );

    expect(wrapper.text()).toBe(fieldName);
    expect(wrapper.find(EuiButtonIcon)).toHaveLength(0);
  });

  it('should render correctly with all actions', async () => {
    const mockClose = jest.fn();
    const fieldName = 'extension';
    const field = dataView.fields.find((f) => f.name === fieldName)!;
    jest.spyOn(field, 'isRuntimeField', 'get').mockImplementation(() => true);
    const wrapper = mountWithIntl(
      <FieldPopoverHeader
        field={field}
        closePopover={mockClose}
        onAddFieldToWorkspace={jest.fn()}
        onAddFilter={jest.fn()}
        onEditField={jest.fn()}
        onDeleteField={jest.fn()}
      />
    );

    expect(wrapper.text()).toBe(fieldName);
    expect(
      wrapper.find(`[data-test-subj="fieldPopoverHeader_addField-${fieldName}"]`).exists()
    ).toBeTruthy();
    expect(
      wrapper.find(`[data-test-subj="fieldPopoverHeader_addExistsFilter-${fieldName}"]`).exists()
    ).toBeTruthy();
    expect(
      wrapper.find(`[data-test-subj="fieldPopoverHeader_editField-${fieldName}"]`).exists()
    ).toBeTruthy();
    expect(
      wrapper.find(`[data-test-subj="fieldPopoverHeader_deleteField-${fieldName}"]`).exists()
    ).toBeTruthy();
    expect(wrapper.find(EuiButtonIcon)).toHaveLength(4);
  });

  it('should correctly handle add-field action', async () => {
    const mockClose = jest.fn();
    const mockAddField = jest.fn();
    const fieldName = 'extension';
    const field = dataView.fields.find((f) => f.name === fieldName)!;
    const wrapper = mountWithIntl(
      <FieldPopoverHeader
        field={field}
        closePopover={mockClose}
        onAddFieldToWorkspace={mockAddField}
      />
    );

    wrapper
      .find(`[data-test-subj="fieldPopoverHeader_addField-${fieldName}"]`)
      .first()
      .simulate('click');

    expect(mockClose).toHaveBeenCalled();
    expect(mockAddField).toHaveBeenCalledWith(field);
  });

  it('should correctly handle add-exists-filter action', async () => {
    const mockClose = jest.fn();
    const mockAddFilter = jest.fn();
    const fieldName = 'extension';
    const field = dataView.fields.find((f) => f.name === fieldName)!;

    // available
    let wrapper = mountWithIntl(
      <FieldPopoverHeader field={field} closePopover={mockClose} onAddFilter={mockAddFilter} />
    );
    wrapper
      .find(`[data-test-subj="fieldPopoverHeader_addExistsFilter-${fieldName}"]`)
      .first()
      .simulate('click');
    expect(mockClose).toHaveBeenCalled();
    expect(mockAddFilter).toHaveBeenCalledWith('_exists_', fieldName, '+');

    // hidden
    jest.spyOn(field, 'filterable', 'get').mockImplementation(() => false);
    wrapper = mountWithIntl(
      <FieldPopoverHeader field={field} closePopover={mockClose} onAddFilter={mockAddFilter} />
    );
    expect(
      wrapper.find(`[data-test-subj="fieldPopoverHeader_addExistsFilter-${fieldName}"]`).exists()
    ).toBeFalsy();
  });

  it('should correctly handle edit-field action', async () => {
    const mockClose = jest.fn();
    const mockEditField = jest.fn();
    const fieldName = 'extension';
    const field = dataView.fields.find((f) => f.name === fieldName)!;

    // available
    jest.spyOn(field, 'isRuntimeField', 'get').mockImplementation(() => true);
    let wrapper = mountWithIntl(
      <FieldPopoverHeader field={field} closePopover={mockClose} onEditField={mockEditField} />
    );
    wrapper
      .find(`[data-test-subj="fieldPopoverHeader_editField-${fieldName}"]`)
      .first()
      .simulate('click');
    expect(mockClose).toHaveBeenCalled();
    expect(mockEditField).toHaveBeenCalledWith(fieldName);

    // hidden
    jest.spyOn(field, 'isRuntimeField', 'get').mockImplementation(() => false);
    jest.spyOn(field, 'type', 'get').mockImplementation(() => 'unknown');
    wrapper = mountWithIntl(
      <FieldPopoverHeader field={field} closePopover={mockClose} onEditField={mockEditField} />
    );
    expect(
      wrapper.find(`[data-test-subj="fieldPopoverHeader_editField-${fieldName}"]`).exists()
    ).toBeFalsy();
  });

  it('should correctly handle delete-field action', async () => {
    const mockClose = jest.fn();
    const mockDeleteField = jest.fn();
    const fieldName = 'extension';
    const field = dataView.fields.find((f) => f.name === fieldName)!;

    // available
    jest.spyOn(field, 'isRuntimeField', 'get').mockImplementation(() => true);
    let wrapper = mountWithIntl(
      <FieldPopoverHeader field={field} closePopover={mockClose} onDeleteField={mockDeleteField} />
    );
    wrapper
      .find(`[data-test-subj="fieldPopoverHeader_deleteField-${fieldName}"]`)
      .first()
      .simulate('click');
    expect(mockClose).toHaveBeenCalled();
    expect(mockDeleteField).toHaveBeenCalledWith(fieldName);

    // hidden
    jest.spyOn(field, 'isRuntimeField', 'get').mockImplementation(() => false);
    wrapper = mountWithIntl(
      <FieldPopoverHeader field={field} closePopover={mockClose} onDeleteField={mockDeleteField} />
    );
    expect(
      wrapper.find(`[data-test-subj="fieldPopoverHeader_deleteField-${fieldName}"]`).exists()
    ).toBeFalsy();
  });
});
