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

import React, { ReactElement } from 'react';
import { shallow, ShallowWrapper } from 'enzyme';

import { Table, TableProps, TableState } from './table';
import { EuiTableFieldDataColumnType, keyCodes } from '@elastic/eui';
import { IIndexPattern } from 'src/plugins/data/public';
import { SourceFiltersTableFilter } from '../../types';

const indexPattern = {} as IIndexPattern;
const items: SourceFiltersTableFilter[] = [{ value: 'tim*', clientId: '' }];

const getIndexPatternMock = (mockedFields: any = {}) => ({ ...mockedFields } as IIndexPattern);

const getTableColumnRender = (
  component: ShallowWrapper<TableProps, TableState, Table>,
  index: number = 0
) => {
  const columns = component.prop<Array<EuiTableFieldDataColumnType<SourceFiltersTableFilter>>>(
    'columns'
  );
  return {
    render: columns[index].render as (...args: any) => ReactElement,
  };
};

describe('Table', () => {
  test('should render normally', () => {
    const component = shallow(
      <Table
        indexPattern={indexPattern}
        items={items}
        deleteFilter={() => {}}
        fieldWildcardMatcher={() => {}}
        saveFilter={() => undefined}
        isSaving={true}
      />
    );

    expect(component).toMatchSnapshot();
  });

  test('should render filter matches', () => {
    const component = shallow<Table>(
      <Table
        indexPattern={getIndexPatternMock({
          getNonScriptedFields: () => [{ name: 'time' }, { name: 'value' }],
        })}
        items={items}
        deleteFilter={() => {}}
        fieldWildcardMatcher={(filter: string) => (field: string) => field.includes(filter[0])}
        saveFilter={() => undefined}
        isSaving={false}
      />
    );

    const matchesTableCell = shallow(
      getTableColumnRender(component, 1).render('tim', { clientId: 1 })
    );
    expect(matchesTableCell).toMatchSnapshot();
  });

  describe('editing', () => {
    const saveFilter = jest.fn();
    const clientId = '1';
    let component: ShallowWrapper<TableProps, TableState, Table>;

    beforeEach(() => {
      component = shallow<Table>(
        <Table
          indexPattern={indexPattern}
          items={items}
          deleteFilter={() => {}}
          fieldWildcardMatcher={() => {}}
          saveFilter={saveFilter}
          isSaving={false}
        />
      );
    });

    test('should show an input field', () => {
      // Start the editing process

      const editingComponent = shallow(
        // Wrap in a div because: https://github.com/airbnb/enzyme/issues/1213
        <div>{getTableColumnRender(component, 2).render({ clientId, value: 'tim*' })}</div>
      );
      editingComponent.find('EuiButtonIcon').at(1).simulate('click');
      // Ensure the state change propagates
      component.update();

      const cell = getTableColumnRender(component).render('tim*', { clientId });
      const filterNameTableCell = shallow(cell);

      expect(filterNameTableCell).toMatchSnapshot();
    });

    test('should show a save button', () => {
      // Start the editing process
      const editingComponent = shallow(
        // Fixes: Invariant Violation: ReactShallowRenderer render(): Shallow rendering works only with custom components, but the provided element type was `symbol`.
        <div>{getTableColumnRender(component, 2).render({ clientId, value: 'tim*' })}</div>
      );

      editingComponent.find('EuiButtonIcon').at(1).simulate('click');

      // Ensure the state change propagates
      component.update();

      // Verify save button
      const saveTableCell = shallow(
        // Fixes Invariant Violation: ReactShallowRenderer render(): Shallow rendering works only with custom components, but the provided element type was `symbol`.
        <div>{getTableColumnRender(component, 2).render({ clientId, value: 'tim*' })}</div>
      );
      expect(saveTableCell).toMatchSnapshot();
    });

    test('should update the matches dynamically as input value is changed', () => {
      const localComponent = shallow(
        <Table
          indexPattern={getIndexPatternMock({
            getNonScriptedFields: () => [{ name: 'time' }, { name: 'value' }],
          })}
          items={items}
          deleteFilter={() => {}}
          fieldWildcardMatcher={(query: string) => () => query.includes('time*')}
          saveFilter={saveFilter}
          isSaving={false}
        />
      );

      // Start the editing process
      const editingComponent = shallow(
        // Fixes: Invariant Violation: ReactShallowRenderer render(): Shallow rendering works only with custom components, but the provided element type was `symbol`.
        <div>{localComponent.prop('columns')[2].render({ clientId, value: 'tim*' })}</div>
      );

      editingComponent.find('EuiButtonIcon').at(1).simulate('click');

      // Update the value
      localComponent.setState({ editingFilterValue: 'time*' });

      // Ensure the state change propagates
      localComponent.update();

      // Verify updated matches
      const matchesTableCell = shallow(
        // Fixes Invariant Violation: ReactShallowRenderer render(): Shallow rendering works only with custom components, but the provided element type was `symbol`.
        <div>{localComponent.prop('columns')[1].render('tim*', { clientId })}</div>
      );
      expect(matchesTableCell).toMatchSnapshot();
    });

    test('should exit on save', () => {
      // Change the value to something else
      component.setState({
        editingFilterId: clientId,
        editingFilterValue: 'ti*',
      });

      // Click the save button
      const editingComponent = shallow(
        // Fixes Invariant Violation: ReactShallowRenderer render(): Shallow rendering works only with custom components, but the provided element type was `symbol`.
        <div>{getTableColumnRender(component, 2).render({ clientId, value: 'tim*' })}</div>
      );

      editingComponent.find('EuiButtonIcon').at(0).simulate('click');

      editingComponent.update();

      // Ensure we call saveFilter properly
      expect(saveFilter).toBeCalledWith({
        clientId,
        value: 'ti*',
      });

      // Ensure the state is properly reset
      expect(component.state('editingFilterId')).toBe('');
    });
  });

  test('should allow deletes', () => {
    const deleteFilter = jest.fn();

    const component = shallow(
      <Table
        indexPattern={indexPattern}
        items={items}
        deleteFilter={deleteFilter}
        fieldWildcardMatcher={() => {}}
        saveFilter={() => undefined}
        isSaving={false}
      />
    );

    // Click the delete button
    const deleteCellComponent = shallow(
      // Fixes Invariant Violation: ReactShallowRenderer render(): Shallow rendering works only with custom components, but the provided element type was `symbol`.
      <div>{component.prop('columns')[2].render({ clientId: 1, value: 'tim*' })}</div>
    );
    deleteCellComponent.find('EuiButtonIcon').at(1).simulate('click');
    expect(deleteFilter).toBeCalled();
  });

  test('should save when in edit mode and the enter key is pressed', () => {
    const saveFilter = jest.fn();

    const component = shallow(
      <Table
        indexPattern={indexPattern}
        items={items}
        deleteFilter={() => {}}
        fieldWildcardMatcher={() => {}}
        saveFilter={saveFilter}
        isSaving={false}
      />
    );

    // Start the editing process
    const editingComponent = shallow(
      // Fixes Invariant Violation: ReactShallowRenderer render(): Shallow rendering works only with custom components, but the provided element type was `symbol`.
      <div>{component.prop('columns')[2].render({ clientId: 1, value: 'tim*' })}</div>
    );
    editingComponent.find('EuiButtonIcon').at(0).simulate('click');

    component.update();

    // Get the rendered input cell
    const filterNameTableCell = shallow(
      // Fixes Invariant Violation: ReactShallowRenderer render(): Shallow rendering works only with custom components, but the provided element type was `symbol`.
      <div>{component.prop('columns')[0].render('tim*', { clientId: 1 })}</div>
    );

    // Press the enter key
    filterNameTableCell.find('EuiFieldText').simulate('keydown', { keyCode: keyCodes.ENTER });
    expect(saveFilter).toBeCalled();

    // It should reset
    expect(component.state('editingFilterId')).toBe('');
  });

  test('should cancel when in edit mode and the esc key is pressed', () => {
    const saveFilter = jest.fn();

    const component = shallow(
      <Table
        indexPattern={indexPattern}
        items={items}
        deleteFilter={() => {}}
        fieldWildcardMatcher={() => {}}
        saveFilter={saveFilter}
        isSaving={false}
      />
    );

    // Start the editing process
    const editingComponent = shallow(
      // Fixes Invariant Violation: ReactShallowRenderer render(): Shallow rendering works only with custom components, but the provided element type was `symbol`.
      <div>{component.prop('columns')[2].render({ clientId: 1, value: 'tim*' })}</div>
    );

    editingComponent.find('EuiButtonIcon').at(0).simulate('click');

    // Ensure the state change propagates
    component.update();

    // Get the rendered input cell
    const filterNameTableCell = shallow(
      // Fixes Invariant Violation: ReactShallowRenderer render(): Shallow rendering works only with custom components, but the provided element type was `symbol`.
      <div>{component.prop('columns')[0].render('tim*', { clientId: 1 })}</div>
    );

    // Press the ESCAPE key
    filterNameTableCell.find('EuiFieldText').simulate('keydown', { keyCode: keyCodes.ESCAPE });
    expect(saveFilter).not.toBeCalled();

    // It should reset
    expect(component.state('editingFilterId')).toBe('');
  });
});
