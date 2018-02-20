import React from 'react';
import { shallow } from 'enzyme';

import {
  Footer,
} from './footer';

test('render', () => {
  const component = shallow(<Footer/>);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

describe('props', () => {
  test('launchApp', () => {
    const launchApp = {
      url: '/app/myapp',
      label: 'launch myapp'
    };
    const component = shallow(<Footer
      launchApp={launchApp}
    />);
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('overviewDashboard', () => {
    const overviewDashboard = {
      id: '1234',
      linkLabel: 'My Overview Dashboard'
    };
    const component = shallow(<Footer
      overviewDashboard={overviewDashboard}
    />);
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });
});
