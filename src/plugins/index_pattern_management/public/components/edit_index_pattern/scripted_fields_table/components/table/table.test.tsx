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

import { Table } from '../table';
import { ScriptedFieldItem } from '../../types';
import { IIndexPattern } from 'src/plugins/data/public';

const getIndexPatternMock = (mockedFields: any = {}) => ({ ...mockedFields } as IIndexPattern);

const items: ScriptedFieldItem[] = [{ name: '1', lang: 'Elastic', script: '' }];

describe('Table', () => {
  let indexPattern: IIndexPattern;

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
});
