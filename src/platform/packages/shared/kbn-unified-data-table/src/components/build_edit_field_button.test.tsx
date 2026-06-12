/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { EuiListGroupItemProps } from '@elastic/eui';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { buildEditFieldButton } from './build_edit_field_button';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { EuiListGroupItem } from '@elastic/eui';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { servicesMock } from '../../__mocks__/services';

const getField = (name: string) => dataViewMock.getFieldByName(name) as DataViewField;

const unknownField = dataViewMock.fields.create({
  aggregatable: false,
  name: 'unknown_field',
  searchable: false,
  type: 'unknown',
});

describe('buildEditFieldButton', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return null if the field is not editable', () => {
    const button = buildEditFieldButton({
      dataView: dataViewMock,
      editField: jest.fn(),
      field: unknownField,
      hasEditDataViewPermission: () => servicesMock.dataViewEditor.userPermissions.editDataView(),
    });

    expect(button).toBeNull();
  });

  it('should return null if the data view is not editable', () => {
    jest
      .spyOn(servicesMock.dataViewEditor.userPermissions, 'editDataView')
      .mockReturnValueOnce(false);

    const field = getField('bytes');
    const button = buildEditFieldButton({
      dataView: dataViewMock,
      editField: jest.fn(),
      field,
      hasEditDataViewPermission: () => servicesMock.dataViewEditor.userPermissions.editDataView(),
    });

    expect(button).toBeNull();
  });

  it('should return null if passed the _source field', () => {
    const field = getField('_source');
    const button = buildEditFieldButton({
      dataView: dataViewMock,
      editField: jest.fn(),
      field,
      hasEditDataViewPermission: () => servicesMock.dataViewEditor.userPermissions.editDataView(),
    });

    expect(button).toBeNull();
  });

  it('should return EuiListGroupItemProps if the field and data view are editable', () => {
    const field = getField('bytes');
    const button = buildEditFieldButton({
      dataView: dataViewMock,
      editField: jest.fn(),
      field,
      hasEditDataViewPermission: () => servicesMock.dataViewEditor.userPermissions.editDataView(),
    }) as EuiListGroupItemProps;

    expect(button).not.toBeNull();
    expect(button).toMatchObject({
      'data-test-subj': 'gridEditFieldButton',
      iconProps: { size: 'm' },
      iconType: 'pencil',
    });
    expect(button.onClick).toEqual(expect.any(Function));

    renderWithI18n(<EuiListGroupItem {...button} />);

    expect(screen.getByText('Edit data view field')).toBeVisible();
  });

  it('should call editField when onClick is triggered', async () => {
    const editField = jest.fn();
    const field = getField('bytes');
    const buttonProps = buildEditFieldButton({
      dataView: dataViewMock,
      editField,
      field,
      hasEditDataViewPermission: () => servicesMock.dataViewEditor.userPermissions.editDataView(),
    }) as EuiListGroupItemProps;

    renderWithI18n(<EuiListGroupItem {...buttonProps} />);

    await userEvent.click(screen.getByText('Edit data view field'));

    expect(editField).toHaveBeenCalledTimes(1);
    expect(editField).toHaveBeenCalledWith('bytes');
  });
});
