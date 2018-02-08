import React from 'react';
import { LoadingState } from '../loading_state';
import { shallow } from 'enzyme';

describe('LoadingState', () => {
  it('should render normally', () => {
    const component = shallow(
      <LoadingState/>
    );

    expect(component).toMatchSnapshot();
  });
});
