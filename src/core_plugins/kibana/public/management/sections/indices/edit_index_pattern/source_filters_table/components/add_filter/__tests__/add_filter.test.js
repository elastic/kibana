import React from 'react';
import { shallow } from 'enzyme';

import { AddFilter } from '../add_filter';

describe('AddFilter', () => {
  it('should render normally', async () => {
    const component = shallow(
      <AddFilter addFilter={() => {}}/>
    );

    expect(component).toMatchSnapshot();
  });

  it('should allow adding a filter', async () => {
    const addFilter = jest.fn();
    const component = shallow(
      <AddFilter addFilter={addFilter}/>
    );

    // Set a value in the input field
    component.setState({ filter: 'tim*' });

    // Click the button
    component.find('EuiButton').simulate('click');
    component.update();

    expect(addFilter).toBeCalledWith('tim*');
  });
});
