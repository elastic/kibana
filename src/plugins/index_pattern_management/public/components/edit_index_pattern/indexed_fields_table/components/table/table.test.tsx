/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
