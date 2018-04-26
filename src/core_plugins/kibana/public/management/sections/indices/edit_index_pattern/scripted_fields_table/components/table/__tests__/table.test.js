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

const items = [{ id: 1, name: 'Elastic' }];

describe('Table', () => {
  it('should render normally', async () => {
    const component = shallow(
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
    const component = shallow(
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

    const component = shallow(
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

    const component = shallow(
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
