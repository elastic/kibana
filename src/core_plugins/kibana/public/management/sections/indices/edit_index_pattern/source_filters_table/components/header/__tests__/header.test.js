import React from 'react';
import { shallow } from 'enzyme';

import { Header } from '../header';

describe('Header', () => {
  it('should render normally', async () => {
    const component = shallow(
      <Header/>
    );

    expect(component).toMatchSnapshot();
  });
});
