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
import { mount, shallow } from 'enzyme';
import { requiredProps, takeMountedSnapshot } from '../../../test';
import { KuiListingTable } from './listing_table';

const getProps = customProps => {
  const defaultProps = {
    header: ['Breed', 'Description'],
    rows: [
      {
        id: '1',
        cells: ['Bengal', 'An athlete, spotted cat'],
      },
      {
        id: '2',
        cells: ['Himalayan', 'Affectionate but discriminating'],
      },
      {
        id: '3',
        cells: ['Chartreux', 'Silent but communicative and sometimes silly'],
      },
    ],
    onItemSelectionChanged: jest.fn(),
    selectedRowIds: [],
    onFilter: jest.fn(),
  };

  return {
    ...defaultProps,
    ...requiredProps,
    ...customProps,
  };
};

test('renders KuiListingTable', () => {
  const component = mount(<KuiListingTable {...getProps()} />);
  expect(takeMountedSnapshot(component)).toMatchSnapshot();
});

test('selecting a row calls onItemSelectionChanged', () => {
  const props = getProps();
  const component = shallow(<KuiListingTable {...props} />);
  component
    .find('KuiListingTableRow')
    .at(1)
    .prop('onSelectionChanged')('1');
  expect(props.onItemSelectionChanged).toHaveBeenCalledWith(['1']);
});

test('selectedRowIds is preserved when onItemSelectionChanged is called', () => {
  const props = getProps({ selectedRowIds: ['3'] });
  const component = shallow(<KuiListingTable {...props} />);
  component
    .find('KuiListingTableRow')
    .at(0)
    .prop('onSelectionChanged')('1');
  expect(props.onItemSelectionChanged).toHaveBeenCalledWith(expect.arrayContaining(['1', '3']));
});

test('onFilter is called when the search box is used', () => {
  const props = getProps();
  const component = mount(<KuiListingTable {...props} />);
  component.find('KuiToolBarSearchBox').prop('onFilter')('a filter');
  expect(props.onFilter).toHaveBeenCalledWith('a filter');
});
