import React from 'react';
import { shallow } from 'enzyme';

import { Header } from '../header';

describe('Header', () => {
  it('should render normally', () => {
    const props = {
      onExportAll: () => {},
      onImport: () => {},
      onRefresh: () => {},
      totalCount: 4,
    };

    const component = shallow(
      <Header
        {...props}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
