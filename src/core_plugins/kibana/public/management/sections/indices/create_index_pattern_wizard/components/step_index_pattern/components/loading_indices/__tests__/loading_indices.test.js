import React from 'react';
import { LoadingIndices } from '../loading_indices';
import { shallow } from 'enzyme';

describe('LoadingIndices', () => {
  it('should render normally', () => {
    const component = shallow(
      <LoadingIndices/>
    );

    expect(component).toMatchSnapshot();
  });
});
