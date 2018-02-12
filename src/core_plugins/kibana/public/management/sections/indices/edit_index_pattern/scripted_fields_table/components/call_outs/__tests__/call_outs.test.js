import React from 'react';
import { shallow } from 'enzyme';

import { CallOuts } from '../call_outs';

describe('CallOuts', () => {
  it('should render normally', async () => {
    const component = shallow(
      <CallOuts
        deprecatedLangsInUse={['php']}
        painlessDocLink="http://www.elastic.co/painlessDocs"
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render without any call outs', async () => {
    const component = shallow(
      <CallOuts
        deprecatedLangsInUse={[]}
        painlessDocLink="http://www.elastic.co/painlessDocs"
      />
    );

    expect(component).toMatchSnapshot();
  });
});
