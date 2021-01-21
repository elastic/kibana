/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
    excluded: false,
    format: '',
  },
  {
    name: 'timestamp',
    displayName: 'timestamp',
    type: 'date',
    info: [],
    excluded: false,
    format: 'YYYY-MM-DD',
  },
  {
    name: 'conflictingField',
    displayName: 'conflictingField',
    type: 'conflict',
    info: [],
    excluded: false,
    format: '',
  },
];

describe('Table', () => {
  test('should render normally', () => {
    const component = shallow(
      <Table indexPattern={indexPattern} items={items} editField={() => {}} />
    );

    expect(component).toMatchSnapshot();
  });

  test('should render normal field name', () => {
    const component = shallow(
      <Table indexPattern={indexPattern} items={items} editField={() => {}} />
    );

    const tableCell = shallow(component.prop('columns')[0].render('Elastic', items[0]));
    expect(tableCell).toMatchSnapshot();
  });

  test('should render timestamp field name', () => {
    const component = shallow(
      <Table indexPattern={indexPattern} items={items} editField={() => {}} />
    );

    const tableCell = shallow(component.prop('columns')[0].render('timestamp', items[1]));
    expect(tableCell).toMatchSnapshot();
  });

  test('should render the boolean template (true)', () => {
    const component = shallow(
      <Table indexPattern={indexPattern} items={items} editField={() => {}} />
    );

    const tableCell = shallow(component.prop('columns')[3].render(true));
    expect(tableCell).toMatchSnapshot();
  });

  test('should render the boolean template (false)', () => {
    const component = shallow(
      <Table indexPattern={indexPattern} items={items} editField={() => {}} />
    );

    const tableCell = shallow(component.prop('columns')[3].render(false, items[2]));
    expect(tableCell).toMatchSnapshot();
  });

  test('should render normal type', () => {
    const component = shallow(
      <Table indexPattern={indexPattern} items={items} editField={() => {}} />
    );

    const tableCell = shallow(component.prop('columns')[1].render('string'));
    expect(tableCell).toMatchSnapshot();
  });

  test('should render conflicting type', () => {
    const component = shallow(
      <Table indexPattern={indexPattern} items={items} editField={() => {}} />
    );

    const tableCell = shallow(component.prop('columns')[1].render('conflict', true));
    expect(tableCell).toMatchSnapshot();
  });

  test('should allow edits', () => {
    const editField = jest.fn();

    const component = shallow(
      <Table indexPattern={indexPattern} items={items} editField={editField} />
    );

    // Click the edit button
    component.prop('columns')[6].actions[0].onClick();
    expect(editField).toBeCalled();
  });
});
