import React from 'react';
import { shallow } from 'enzyme';

import { Table } from '../table';

const indexPattern = {};
const model = {
  data: {
    records: [{ value: 'tim*' }],
    totalRecordCount: 1,
  },
  criteria: {
    page: {
      index: 0,
      size: 10,
    },
    sort: {
      field: 'value',
      direction: 'asc'
    },
  }
};

describe('Table', () => {
  it('should render normally', async () => {
    const component = shallow(
      <Table
        indexPattern={indexPattern}
        model={model}
        deleteFilter={() => {}}
        onDataCriteriaChange={() => {}}
        fieldWildcardMatcher={() => {}}
        saveFilter={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render filter matches', async () => {
    const component = shallow(
      <Table
        indexPattern={{
          getNonScriptedFields: () => ([{ name: 'time' }, { name: 'value' }])
        }}
        model={model}
        deleteFilter={() => {}}
        onDataCriteriaChange={() => {}}
        fieldWildcardMatcher={filter => field => field.includes(filter[0])}
        saveFilter={() => {}}
      />
    );

    const matchesTableCell = shallow(component.prop('config').columns[1].render('tim'));
    expect(matchesTableCell).toMatchSnapshot();
  });

  it('should allow edits', async () => {
    const saveFilter = jest.fn();

    const component = shallow(
      <Table
        indexPattern={indexPattern}
        model={model}
        deleteFilter={() => {}}
        onDataCriteriaChange={() => {}}
        fieldWildcardMatcher={() => {}}
        saveFilter={saveFilter}
      />
    );

    // Start the editing process
    component.prop('config').columns[2].actions[0].onClick({ value: 'tim*' });
    // Ensure the state change propagates
    component.update();

    // Ensure the table cell switches to an input
    const filterNameTableCell = shallow(component.prop('config').columns[0].render('tim*'));
    expect(filterNameTableCell).toMatchSnapshot();

    // Also verify the action is now save
    expect(component.prop('config').columns[2].actions[0].name).toBe('Save');

    // Let's also verify the close of the edit process

    // Change the value to something else
    component.setState({ editingFilterValue: 'ti*' });

    // Click the save button
    component.prop('config').columns[2].actions[0].onClick();

    // Ensure we call saveFilter properly
    expect(saveFilter).toBeCalledWith({ newFilterValue: 'ti*', oldFilterValue: 'tim*' });

    // Ensure the state is properly reset
    expect(component.state('editingFilter')).toBe(null);
  });

  it('should allow deletes', () => {
    const deleteFilter = jest.fn();

    const component = shallow(
      <Table
        indexPattern={indexPattern}
        model={model}
        deleteFilter={deleteFilter}
        onDataCriteriaChange={() => {}}
        fieldWildcardMatcher={() => {}}
        saveFilter={() => {}}
      />
    );

    // Click the delete button
    component.prop('config').columns[2].actions[1].onClick();
    expect(deleteFilter).toBeCalled();
  });
});
