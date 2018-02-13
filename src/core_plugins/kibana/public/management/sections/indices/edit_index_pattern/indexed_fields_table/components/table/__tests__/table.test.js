import React from 'react';
import { shallow } from 'enzyme';

import { Table } from '../table';

const indexPattern = {
  timeFieldName: 'timestamp'
};

const model = {
  data: {
    records: [
      { name: 'Elastic', displayName: 'Elastic', searchable: true },
      { name: 'timestamp', displayName: 'timestamp', type: 'date' },
      { name: 'conflictingField', displayName: 'conflictingField', type: 'conflict' },
    ],
    totalRecordCount: 3,
  },
  criteria: {
    page: {
      index: 0,
      size: 10,
    },
    sort: {
      field: 'displayName',
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
        onDataCriteriaChange={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render normal field name', async () => {
    const component = shallow(
      <Table
        indexPattern={indexPattern}
        model={model}
        editField={() => {}}
        onDataCriteriaChange={() => {}}
      />
    );

    const tableCell = shallow(component.prop('config').columns[0].render('Elastic'));
    expect(tableCell).toMatchSnapshot();
  });

  it('should render timestamp field name', async () => {
    const component = shallow(
      <Table
        indexPattern={indexPattern}
        model={model}
        editField={() => {}}
        onDataCriteriaChange={() => {}}
      />
    );

    const tableCell = shallow(component.prop('config').columns[0].render('timestamp', true));
    expect(tableCell).toMatchSnapshot();
  });

  it('should render the boolean template (true)', async () => {
    const component = shallow(
      <Table
        indexPattern={indexPattern}
        model={model}
        editField={() => {}}
        onDataCriteriaChange={() => {}}
      />
    );

    const tableCell = shallow(component.prop('config').columns[3].render(true));
    expect(tableCell).toMatchSnapshot();
  });

  it('should render the boolean template (false)', async () => {
    const component = shallow(
      <Table
        indexPattern={indexPattern}
        model={model}
        editField={() => {}}
        onDataCriteriaChange={() => {}}
      />
    );

    const tableCell = shallow(component.prop('config').columns[3].render(false));
    expect(tableCell).toMatchSnapshot();
  });

  it('should render normal type', async () => {
    const component = shallow(
      <Table
        indexPattern={indexPattern}
        model={model}
        editField={() => {}}
        onDataCriteriaChange={() => {}}
      />
    );

    const tableCell = shallow(component.prop('config').columns[1].render('string'));
    expect(tableCell).toMatchSnapshot();
  });

  it('should render conflicting type', async () => {
    const component = shallow(
      <Table
        indexPattern={indexPattern}
        model={model}
        editField={() => {}}
        onDataCriteriaChange={() => {}}
      />
    );

    const tableCell = shallow(component.prop('config').columns[1].render('conflict', true));
    expect(tableCell).toMatchSnapshot();
  });

  it('should allow edits', () => {
    const editField = jest.fn();

    const component = shallow(
      <Table
        indexPattern={indexPattern}
        model={model}
        editField={editField}
        onDataCriteriaChange={() => {}}
      />
    );

    // Click the edit button
    component.prop('config').columns[6].actions[0].onClick();
    expect(editField).toBeCalled();
  });
});
