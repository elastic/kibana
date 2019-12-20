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
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { TableHeader } from './table_header';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';
import { SortOrder } from './helpers';
import { IndexPattern, IFieldType } from '../../../../../kibana_services';

function getMockIndexPattern() {
  return ({
    id: 'test',
    title: 'Test',
    timeFieldName: 'time',
    fields: [],
    isTimeNanosBased: () => false,
    getFieldByName: (name: string) => {
      if (name === 'test1') {
        return {
          name,
          type: 'string',
          aggregatable: false,
          searchable: true,
          sortable: true,
        } as IFieldType;
      } else {
        return {
          name,
          type: 'string',
          aggregatable: false,
          searchable: true,
          sortable: false,
        } as IFieldType;
      }
    },
  } as unknown) as IndexPattern;
}

function getMockProps(props = {}) {
  const defaultProps = {
    indexPattern: getMockIndexPattern(),
    hideTimeColumn: false,
    columns: ['first', 'middle', 'last'],
    sortOrder: [['time', 'asc']] as SortOrder[],
    isShortDots: true,
    onRemoveColumn: jest.fn(),
    onChangeSortOrder: jest.fn(),
    onMoveColumn: jest.fn(),
    onPageNext: jest.fn(),
    onPagePrevious: jest.fn(),
  };

  return Object.assign({}, defaultProps, props);
}

describe('TableHeader with time column', () => {
  const props = getMockProps();

  const wrapper = mountWithIntl(
    <table>
      <thead>
        <TableHeader {...props} />
      </thead>
    </table>
  );

  test('renders correctly', () => {
    const docTableHeader = findTestSubject(wrapper, 'docTableHeader');
    expect(docTableHeader.getDOMNode()).toMatchSnapshot();
  });

  test('time column is sortable with button, cycling sort direction', () => {
    findTestSubject(wrapper, 'docTableHeaderFieldSort_time').simulate('click');
    expect(props.onChangeSortOrder).toHaveBeenCalledWith([['time', 'desc']]);
  });

  test('time column is not removeable, no button displayed', () => {
    const removeButton = findTestSubject(wrapper, 'docTableRemoveHeader-time');
    expect(removeButton.length).toBe(0);
  });

  test('time column is not moveable, no button displayed', () => {
    const moveButtonLeft = findTestSubject(wrapper, 'docTableMoveLeftHeader-time');
    expect(moveButtonLeft.length).toBe(0);
    const moveButtonRight = findTestSubject(wrapper, 'docTableMoveRightHeader-time');
    expect(moveButtonRight.length).toBe(0);
  });

  test('first column is removeable', () => {
    const removeButton = findTestSubject(wrapper, 'docTableRemoveHeader-first');
    expect(removeButton.length).toBe(1);
    removeButton.simulate('click');
    expect(props.onRemoveColumn).toHaveBeenCalledWith('first');
  });

  test('first column is not moveable to the left', () => {
    const moveButtonLeft = findTestSubject(wrapper, 'docTableMoveLeftHeader-first');
    expect(moveButtonLeft.length).toBe(0);
  });

  test('first column is moveable to the right', () => {
    const moveButtonRight = findTestSubject(wrapper, 'docTableMoveRightHeader-first');
    expect(moveButtonRight.length).toBe(1);
    moveButtonRight.simulate('click');
    expect(props.onMoveColumn).toHaveBeenCalledWith('first', 1);
  });

  test('middle column is moveable to the left', () => {
    const moveButtonLeft = findTestSubject(wrapper, 'docTableMoveLeftHeader-middle');
    expect(moveButtonLeft.length).toBe(1);
    moveButtonLeft.simulate('click');
    expect(props.onMoveColumn).toHaveBeenCalledWith('middle', 0);
  });

  test('middle column is moveable to the right', () => {
    const moveButtonRight = findTestSubject(wrapper, 'docTableMoveRightHeader-middle');
    expect(moveButtonRight.length).toBe(1);
    moveButtonRight.simulate('click');
    expect(props.onMoveColumn).toHaveBeenCalledWith('middle', 2);
  });

  test('last column moveable to the left', () => {
    const moveButtonLeft = findTestSubject(wrapper, 'docTableMoveLeftHeader-last');
    expect(moveButtonLeft.length).toBe(1);
    moveButtonLeft.simulate('click');
    expect(props.onMoveColumn).toHaveBeenCalledWith('last', 1);
  });
});

describe('TableHeader without time column', () => {
  const props = getMockProps({ hideTimeColumn: true });

  const wrapper = mountWithIntl(
    <table>
      <thead>
        <TableHeader {...props} />
      </thead>
    </table>
  );

  test('renders correctly', () => {
    const docTableHeader = findTestSubject(wrapper, 'docTableHeader');
    expect(docTableHeader.getDOMNode()).toMatchSnapshot();
  });

  test('first column is removeable', () => {
    const removeButton = findTestSubject(wrapper, 'docTableRemoveHeader-first');
    expect(removeButton.length).toBe(1);
    removeButton.simulate('click');
    expect(props.onRemoveColumn).toHaveBeenCalledWith('first');
  });

  test('first column is not moveable to the left', () => {
    const moveButtonLeft = findTestSubject(wrapper, 'docTableMoveLeftHeader-first');
    expect(moveButtonLeft.length).toBe(0);
  });

  test('first column is moveable to the right', () => {
    const moveButtonRight = findTestSubject(wrapper, 'docTableMoveRightHeader-first');
    expect(moveButtonRight.length).toBe(1);
    moveButtonRight.simulate('click');
    expect(props.onMoveColumn).toHaveBeenCalledWith('first', 1);
  });

  test('middle column is moveable to the left', () => {
    const moveButtonLeft = findTestSubject(wrapper, 'docTableMoveLeftHeader-middle');
    expect(moveButtonLeft.length).toBe(1);
    moveButtonLeft.simulate('click');
    expect(props.onMoveColumn).toHaveBeenCalledWith('middle', 0);
  });

  test('middle column is moveable to the right', () => {
    const moveButtonRight = findTestSubject(wrapper, 'docTableMoveRightHeader-middle');
    expect(moveButtonRight.length).toBe(1);
    moveButtonRight.simulate('click');
    expect(props.onMoveColumn).toHaveBeenCalledWith('middle', 2);
  });

  test('last column moveable to the left', () => {
    const moveButtonLeft = findTestSubject(wrapper, 'docTableMoveLeftHeader-last');
    expect(moveButtonLeft.length).toBe(1);
    moveButtonLeft.simulate('click');
    expect(props.onMoveColumn).toHaveBeenCalledWith('last', 1);
  });
});
