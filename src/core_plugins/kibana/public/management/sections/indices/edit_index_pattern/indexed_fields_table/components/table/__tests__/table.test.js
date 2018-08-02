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
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

import { TableComponent } from '../table';

const indexPattern = {
  timeFieldName: 'timestamp'
};

const items = [
  { name: 'Elastic', displayName: 'Elastic', searchable: true },
  { name: 'timestamp', displayName: 'timestamp', type: 'date' },
  { name: 'conflictingField', displayName: 'conflictingField', type: 'conflict' },
];

describe('Table', () => {
  it('should render normally', async () => {
    const component = shallowWithIntl(
      <TableComponent
        indexPattern={indexPattern}
        items={items}
        editField={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render normal field name', async () => {
    const component = shallowWithIntl(
      <TableComponent
        indexPattern={indexPattern}
        items={items}
        editField={() => {}}
      />
    );

    const tableCell = shallow(component.prop('columns')[0].render('Elastic'));
    expect(tableCell).toMatchSnapshot();
  });

  it('should render timestamp field name', async () => {
    const component = shallowWithIntl(
      <TableComponent
        indexPattern={indexPattern}
        items={items}
        editField={() => {}}
      />
    );

    const tableCell = shallow(component.prop('columns')[0].render('timestamp', true));
    expect(tableCell).toMatchSnapshot();
  });

  it('should render the boolean template (true)', async () => {
    const component = shallowWithIntl(
      <TableComponent
        indexPattern={indexPattern}
        items={items}
        editField={() => {}}
      />
    );

    const tableCell = shallow(component.prop('columns')[3].render(true));
    expect(tableCell).toMatchSnapshot();
  });

  it('should render the boolean template (false)', async () => {
    const component = shallowWithIntl(
      <TableComponent
        indexPattern={indexPattern}
        items={items}
        editField={() => {}}
      />
    );

    const tableCell = shallow(component.prop('columns')[3].render(false));
    expect(tableCell).toMatchSnapshot();
  });

  it('should render normal type', async () => {
    const component = shallowWithIntl(
      <TableComponent
        indexPattern={indexPattern}
        items={items}
        editField={() => {}}
      />
    );

    const tableCell = shallow(component.prop('columns')[1].render('string'));
    expect(tableCell).toMatchSnapshot();
  });

  it('should render conflicting type', async () => {
    const component = shallowWithIntl(
      <TableComponent
        indexPattern={indexPattern}
        items={items}
        editField={() => {}}
      />
    );

    const tableCell = shallow(component.prop('columns')[1].render('conflict', true));
    expect(tableCell).toMatchSnapshot();
  });

  it('should allow edits', () => {
    const editField = jest.fn();

    const component = shallowWithIntl(
      <TableComponent
        indexPattern={indexPattern}
        items={items}
        editField={editField}
      />
    );

    // Click the edit button
    component.prop('columns')[6].actions[0].onClick();
    expect(editField).toBeCalled();
  });
});
