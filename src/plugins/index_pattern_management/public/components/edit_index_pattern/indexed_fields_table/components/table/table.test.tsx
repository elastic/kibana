/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { IIndexPattern } from 'src/plugins/data/public';
import { IndexedFieldItem } from '../../types';
import { Table } from './table';

const indexPattern = {
  timeFieldName: 'timestamp',
} as IIndexPattern;

const items: IndexedFieldItem[] = [
  {
    name: 'Elastic',
    displayName: 'Elastic',
    searchable: true,
    info: [],
    type: 'name',
    kbnType: 'string',
    excluded: false,
    format: '',
    isMapped: true,
  },
  {
    name: 'timestamp',
    displayName: 'timestamp',
    type: 'date',
    kbnType: 'date',
    info: [],
    excluded: false,
    format: 'YYYY-MM-DD',
    isMapped: true,
  },
  {
    name: 'conflictingField',
    displayName: 'conflictingField',
    type: 'text, long',
    kbnType: 'conflict',
    info: [],
    excluded: false,
    format: '',
    isMapped: true,
  },
];

const renderTable = (
  { editField } = {
    editField: () => {},
  }
) =>
  shallow(
    <Table indexPattern={indexPattern} items={items} editField={editField} deleteField={() => {}} />
  );

describe('Table', () => {
  test('should render normally', () => {
    expect(renderTable()).toMatchSnapshot();
  });

  test('should render normal field name', () => {
    const tableCell = shallow(renderTable().prop('columns')[0].render('Elastic', items[0]));
    expect(tableCell).toMatchSnapshot();
  });

  test('should render timestamp field name', () => {
    const tableCell = shallow(renderTable().prop('columns')[0].render('timestamp', items[1]));
    expect(tableCell).toMatchSnapshot();
  });

  test('should render the boolean template (true)', () => {
    const tableCell = shallow(renderTable().prop('columns')[3].render(true));
    expect(tableCell).toMatchSnapshot();
  });

  test('should render the boolean template (false)', () => {
    const tableCell = shallow(renderTable().prop('columns')[3].render(false, items[2]));
    expect(tableCell).toMatchSnapshot();
  });

  test('should render normal type', () => {
    const tableCell = shallow(renderTable().prop('columns')[1].render('string', {}));
    expect(tableCell).toMatchSnapshot();
  });

  test('should render conflicting type', () => {
    const tableCell = shallow(
      renderTable().prop('columns')[1].render('conflict', { kbnType: 'conflict' })
    );
    expect(tableCell).toMatchSnapshot();
  });

  test('should allow edits', () => {
    const editField = jest.fn();

    // Click the edit button
    renderTable({ editField }).prop('columns')[6].actions[0].onClick();
    expect(editField).toBeCalled();
  });
});
