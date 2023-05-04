/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiListGroupItem, EuiListGroupItemProps } from '@elastic/eui';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { buildDataViewMock } from '../../__mocks__/data_view';
import { discoverServiceMock } from '../../__mocks__/services';
import { buildEditFieldButton } from './build_edit_field_button';

const dataView = buildDataViewMock({
  name: 'test-index-view',
  fields: [
    {
      name: '_source',
      type: '_source',
    },
    {
      name: 'unknown_field',
      type: 'unknown',
    },
    {
      name: 'unknown_selected_field',
      type: 'unknown',
    },
    {
      name: 'bytes',
      type: 'number',
    },
    {
      name: 'runtime_field',
      type: 'unknown',
      runtimeField: {
        type: 'unknown',
        script: {
          source: "emit('hello world')",
        },
      },
    },
  ] as DataView['fields'],
});

describe('buildEditFieldButton', () => {
  it('should return null if the field is not editable', () => {
    const field = dataView.getFieldByName('unknown_field') as DataViewField;
    const button = buildEditFieldButton({
      hasEditDataViewPermission: () =>
        discoverServiceMock.dataViewEditor.userPermissions.editDataView(),
      dataView,
      field,
      editField: jest.fn(),
    });
    expect(button).toBeNull();
  });

  it('should return null if the data view is not editable', () => {
    jest
      .spyOn(discoverServiceMock.dataViewEditor.userPermissions, 'editDataView')
      .mockReturnValueOnce(false);
    const field = dataView.getFieldByName('bytes') as DataViewField;
    const button = buildEditFieldButton({
      hasEditDataViewPermission: () =>
        discoverServiceMock.dataViewEditor.userPermissions.editDataView(),
      dataView,
      field,
      editField: jest.fn(),
    });
    expect(button).toBeNull();
  });

  it('should return null if passed the _source field', () => {
    const field = dataView.getFieldByName('_source') as DataViewField;
    const button = buildEditFieldButton({
      hasEditDataViewPermission: () =>
        discoverServiceMock.dataViewEditor.userPermissions.editDataView(),
      dataView,
      field,
      editField: jest.fn(),
    });
    expect(button).toBeNull();
  });

  it('should return EuiListGroupItemProps if the field and data view are editable', () => {
    const field = dataView.getFieldByName('bytes') as DataViewField;
    const button = buildEditFieldButton({
      hasEditDataViewPermission: () =>
        discoverServiceMock.dataViewEditor.userPermissions.editDataView(),
      dataView,
      field,
      editField: jest.fn(),
    });
    expect(button).not.toBeNull();
    expect(button).toMatchInlineSnapshot(`
      Object {
        "data-test-subj": "gridEditFieldButton",
        "iconProps": Object {
          "size": "m",
        },
        "iconType": "pencil",
        "label": <FormattedMessage
          defaultMessage="Edit data view field"
          id="discover.grid.editFieldButton"
          values={Object {}}
        />,
        "onClick": [Function],
        "size": "xs",
      }
    `);
  });

  it('should call editField when onClick is triggered', () => {
    const field = dataView.getFieldByName('bytes') as DataViewField;
    const editField = jest.fn();
    const buttonProps = buildEditFieldButton({
      hasEditDataViewPermission: () =>
        discoverServiceMock.dataViewEditor.userPermissions.editDataView(),
      dataView,
      field,
      editField,
    }) as EuiListGroupItemProps;
    const listItem = mountWithIntl(<EuiListGroupItem {...buttonProps} />);
    listItem.find('button').simulate('click');
    expect(editField).toHaveBeenCalledTimes(1);
    expect(editField).toHaveBeenCalledWith('bytes');
  });
});
