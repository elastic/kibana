/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { Table } from '../table';
import { ScriptedFieldItem } from '../../types';
import { DataView } from 'src/plugins/data_views/public';

const getIndexPatternMock = (mockedFields: any = {}) => ({ ...mockedFields } as DataView);

const items: ScriptedFieldItem[] = [
  { name: '1', lang: 'painless', script: '', isUserEditable: true },
  { name: '2', lang: 'painless', script: '', isUserEditable: false },
];

describe('Table', () => {
  let indexPattern: DataView;

  beforeEach(() => {
    indexPattern = getIndexPatternMock({
      fieldFormatMap: {
        Elastic: {
          type: {
            title: 'string',
          },
        },
      },
    });
  });

  test('should render normally', () => {
    const component = shallow<Table>(
      <Table
        indexPattern={indexPattern}
        items={items}
        editField={() => {}}
        deleteField={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  test('should render the format', () => {
    const component = shallow(
      <Table
        indexPattern={indexPattern}
        items={items}
        editField={() => {}}
        deleteField={() => {}}
      />
    );

    const formatTableCell = shallow(component.prop('columns')[3].render('Elastic'));
    expect(formatTableCell).toMatchSnapshot();
  });

  test('should allow edits', () => {
    const editField = jest.fn();

    const component = shallow(
      <Table
        indexPattern={indexPattern}
        items={items}
        editField={editField}
        deleteField={() => {}}
      />
    );

    // Click the delete button
    component.prop('columns')[4].actions[0].onClick();
    expect(editField).toBeCalled();
  });

  test('should allow deletes', () => {
    const deleteField = jest.fn();

    const component = shallow(
      <Table
        indexPattern={indexPattern}
        items={items}
        editField={() => {}}
        deleteField={deleteField}
      />
    );

    // Click the delete button
    component.prop('columns')[4].actions[1].onClick();
    expect(deleteField).toBeCalled();
  });

  test('should not allow edit or deletion for user with only read access', () => {
    const component = shallow(
      <Table
        indexPattern={indexPattern}
        items={items}
        editField={() => {}}
        deleteField={() => {}}
      />
    );
    const editAvailable = component.prop('columns')[4].actions[0].available(items[1]);
    const deleteAvailable = component.prop('columns')[4].actions[1].available(items[1]);
    expect(editAvailable).toBeFalsy();
    expect(deleteAvailable).toBeFalsy();
  });
});
