import React from 'react';
import { shallow } from 'enzyme';

import { Table } from '../table';

const indexPattern = {
  fieldFormatMap: {
    Elastic: {
      type: {
        title: 'string'
      }
    }
  }
};

const model = {
  data: {
    records: [{ id: 1, name: 'Elastic' }],
    totalRecordCount: 1,
  },
  criteria: {
    page: {
      index: 0,
      size: 10,
    },
    sort: {
      field: 'name',
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
        editField={() => {}}
        deleteField={() => {}}
        onDataCriteriaChange={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render the format', async () => {
    const component = shallow(
      <Table
        indexPattern={indexPattern}
        model={model}
        editField={() => {}}
        deleteField={() => {}}
        onDataCriteriaChange={() => {}}
      />
    );

    const formatTableCell = shallow(component.prop('config').columns[3].render('Elastic'));
    expect(formatTableCell).toMatchSnapshot();
  });

  it('should allow edits', () => {
    const editField = jest.fn();

    const component = shallow(
      <Table
        indexPattern={indexPattern}
        model={model}
        editField={editField}
        deleteField={() => {}}
        onDataCriteriaChange={() => {}}
      />
    );

    // Click the delete button
    component.prop('config').columns[4].actions[0].onClick();
    expect(editField).toBeCalled();
  });

  it('should allow deletes', () => {
    const deleteField = jest.fn();

    const component = shallow(
      <Table
        indexPattern={indexPattern}
        model={model}
        editField={() => {}}
        deleteField={deleteField}
        onDataCriteriaChange={() => {}}
      />
    );

    // Click the delete button
    component.prop('config').columns[4].actions[1].onClick();
    expect(deleteField).toBeCalled();
  });

});
