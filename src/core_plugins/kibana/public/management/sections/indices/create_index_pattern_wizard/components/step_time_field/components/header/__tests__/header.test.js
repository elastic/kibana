import React from 'react';
import { Header } from '../header';
import { shallow } from 'enzyme';

describe('Header', () => {
  it('should render normally', () => {
    const component = shallow(
      <Header
        indexPattern="ki*"
      />
    );

    expect(component).toMatchSnapshot();
  });
});
