import React from 'react';
import { shallow } from 'enzyme';

import { Table } from '../table';

const indexPattern = {
  fieldFormatMap: {}
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
});
