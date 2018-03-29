import React from 'react';
import { shallow } from 'enzyme';

import { CallOuts } from '../call_outs';

describe('CallOuts', () => {
  it('should render normally', async () => {
    const component = shallow(
      <CallOuts />
    );

    expect(component).toMatchSnapshot();
  });
});
