import React from 'react';
import { shallow } from 'enzyme';

import { AddFilter } from '../add_filter';

describe('AddFilter', () => {
  it('should render normally', async () => {
    const component = shallow(
      <AddFilter onAddFilter={() => {}}/>
    );

    expect(component).toMatchSnapshot();
  });

  it('should allow adding a filter', async () => {
    const onAddFilter = jest.fn();
    const component = shallow(
      <AddFilter onAddFilter={onAddFilter}/>
    );

    // Set a value in the input field
    component.setState({ filter: 'tim*' });

    // Click the button
    component.find('EuiButton').simulate('click');
    component.update();

    expect(onAddFilter).toBeCalledWith('tim*');
  });

  it('should ignore strings with just spaces', async () => {
    const component = shallow(
      <AddFilter onAddFilter={() => {}}/>
    );

    // Set a value in the input field
    component.find('EuiFieldText').simulate('keypress', ' ');
    component.update();

    expect(component).toMatchSnapshot();
  });
});
