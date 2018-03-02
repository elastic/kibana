import React from 'react';
import { shallow } from 'enzyme';

import { Table } from '../table';
import { keyCodes } from '@elastic/eui';

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

  describe('editing', () => {
    const saveFilter = jest.fn();
    const clientId = 1;
    let component;

    beforeEach(() => {
      component = shallow(
        <Table
          indexPattern={indexPattern}
          model={model}
          deleteFilter={() => {}}
          onDataCriteriaChange={() => {}}
          fieldWildcardMatcher={() => {}}
          saveFilter={saveFilter}
        />
      );
    });

    it('should show an input field', () => {
      // Start the editing process
      const editingComponent = shallow(
        // Wrap in a div because: https://github.com/airbnb/enzyme/issues/1213
        <div>
          {component.prop('config').columns[2].render({ clientId, value: 'tim*' })}
        </div>
      );
      editingComponent.find('EuiButtonIcon').at(1).simulate('click');
      // Ensure the state change propagates
      component.update();

      // Ensure the table cell switches to an input
      const filterNameTableCell = shallow(component.prop('config').columns[0].render('tim*', { clientId }));
      expect(filterNameTableCell).toMatchSnapshot();
    });

    it('should show a save button', () => {
      // Start the editing process
      const editingComponent = shallow(
        // Fixes: Invariant Violation: ReactShallowRenderer render(): Shallow rendering works only with custom components, but the provided element type was `symbol`.
        <div>
          {component.prop('config').columns[2].render({ clientId, value: 'tim*' })}
        </div>
      );
      editingComponent.find('EuiButtonIcon').at(1).simulate('click');

      // Ensure the state change propagates
      component.update();

      // Verify save button
      const saveTableCell = shallow(
        // Fixes Invariant Violation: ReactShallowRenderer render(): Shallow rendering works only with custom components, but the provided element type was `symbol`.
        <div>
          {component.prop('config').columns[2].render({ clientId, value: 'tim*' })}
        </div>
      );
      expect(saveTableCell).toMatchSnapshot();
    });

    it('should exit on save', () => {
      // Change the value to something else
      component.setState({ editingFilterId: clientId, editingFilterValue: 'ti*' });

      // Click the save button
      const editingComponent = shallow(
        // Fixes Invariant Violation: ReactShallowRenderer render(): Shallow rendering works only with custom components, but the provided element type was `symbol`.
        <div>
          {component.prop('config').columns[2].render({ clientId, value: 'tim*' })}
        </div>
      );
      editingComponent.find('EuiButtonIcon').at(0).simulate('click');

      // Ensure we call saveFilter properly
      expect(saveFilter).toBeCalledWith({ filterId: clientId, newFilterValue: 'ti*' });

      // Ensure the state is properly reset
      expect(component.state('editingFilterId')).toBe(null);
    });
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
    const deleteCellComponent = shallow(
      // Fixes Invariant Violation: ReactShallowRenderer render(): Shallow rendering works only with custom components, but the provided element type was `symbol`.
      <div>
        {component.prop('config').columns[2].render({ clientId: 1, value: 'tim*' })}
      </div>
    );
    deleteCellComponent.find('EuiButtonIcon').at(0).simulate('click');
    expect(deleteFilter).toBeCalled();
  });

  it('should save when in edit mode and the enter key is pressed', () => {
    const saveFilter = jest.fn();
    const clientId = 1;

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
    const editingComponent = shallow(
      // Fixes Invariant Violation: ReactShallowRenderer render(): Shallow rendering works only with custom components, but the provided element type was `symbol`.
      <div>
        {component.prop('config').columns[2].render({ clientId, value: 'tim*' })}
      </div>
    );
    editingComponent.find('EuiButtonIcon').at(1).simulate('click');
    // Ensure the state change propagates
    component.update();

    // Get the rendered input cell
    const filterNameTableCell = shallow(
      // Fixes Invariant Violation: ReactShallowRenderer render(): Shallow rendering works only with custom components, but the provided element type was `symbol`.
      <div>
        {component.prop('config').columns[0].render('tim*', { clientId })}
      </div>
    );

    // Press the enter key
    filterNameTableCell.find('EuiFieldText').simulate('keypress', { charCode: keyCodes.ENTER });
    expect(saveFilter).toBeCalled();

    // It should reset
    expect(component.state('editingFilterId')).toBe(null);
  });

  it('should cancel when in edit mode and the esc key is pressed', () => {
    const saveFilter = jest.fn();
    const clientId = 1;

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
    const editingComponent = shallow(
      // Fixes Invariant Violation: ReactShallowRenderer render(): Shallow rendering works only with custom components, but the provided element type was `symbol`.
      <div>
        {component.prop('config').columns[2].render({ clientId, value: 'tim*' })}
      </div>
    );
    editingComponent.find('EuiButtonIcon').at(1).simulate('click');
    // Ensure the state change propagates
    component.update();

    // Get the rendered input cell
    const filterNameTableCell = shallow(
      // Fixes Invariant Violation: ReactShallowRenderer render(): Shallow rendering works only with custom components, but the provided element type was `symbol`.
      <div>
        {component.prop('config').columns[0].render('tim*', { clientId })}
      </div>
    );

    // Press the enter key
    filterNameTableCell.find('EuiFieldText').simulate('keypress', { charCode: keyCodes.ESCAPE });
    expect(saveFilter).not.toBeCalled();

    // It should reset
    expect(component.state('editingFilterId')).toBe(null);
  });
});
