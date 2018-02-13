import React from 'react';
import { shallow } from 'enzyme';

import { Synopsis } from './synopsis';

test('render', () => {
  const component = shallow(<Synopsis
    description="this is a great tutorial about..."
    title="Great tutorial"
    url="link_to_item"
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

describe('props', () => {
  test('iconType', () => {
    const component = shallow(<Synopsis
      description="this is a great tutorial about..."
      title="Great tutorial"
      url="link_to_item"
      iconType="logoApache"
    />);
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('iconUrl', () => {
    const component = shallow(<Synopsis
      description="this is a great tutorial about..."
      title="Great tutorial"
      url="link_to_item"
      iconUrl="icon_url"
    />);
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });
});
