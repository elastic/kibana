import React from 'react';
import { EmptyState } from '../empty_state';
import { shallow } from 'enzyme';

describe('EmptyState', () => {
  it('should render normally', () => {
    const component = shallow(
      <EmptyState
        loadingDataDocUrl="http://www.elastic.co"
      />
    );

    expect(component).toMatchSnapshot();
  });
});
