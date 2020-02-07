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
import { shallowWithI18nProvider } from 'test_utils/enzyme_helpers';

import { Table } from '../table';

const indexPattern = {
  fieldFormatMap: {
    Elastic: {
      type: {
        title: 'string',
      },
    },
  },
};

const items = [{ id: 1, name: 'Elastic' }];

describe('Table', () => {
  it('should render normally', async () => {
    const component = shallowWithI18nProvider(
      <Table
        indexPattern={indexPattern}
        items={items}
        editField={() => {}}
        deleteField={() => {}}
        onChange={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render the format', async () => {
    const component = shallowWithI18nProvider(
      <Table
        indexPattern={indexPattern}
        items={items}
        editField={() => {}}
        deleteField={() => {}}
        onChange={() => {}}
      />
    );

    const formatTableCell = shallow(component.prop('columns')[3].render('Elastic'));
    expect(formatTableCell).toMatchSnapshot();
  });

  it('should allow edits', () => {
    const editField = jest.fn();

    const component = shallowWithI18nProvider(
      <Table
        indexPattern={indexPattern}
        items={items}
        editField={editField}
        deleteField={() => {}}
        onChange={() => {}}
      />
    );

    // Click the delete button
    component.prop('columns')[4].actions[0].onClick();
    expect(editField).toBeCalled();
  });

  it('should allow deletes', () => {
    const deleteField = jest.fn();

    const component = shallowWithI18nProvider(
      <Table
        indexPattern={indexPattern}
        items={items}
        editField={() => {}}
        deleteField={deleteField}
        onChange={() => {}}
      />
    );

    // Click the delete button
    component.prop('columns')[4].actions[1].onClick();
    expect(deleteField).toBeCalled();
  });
});
