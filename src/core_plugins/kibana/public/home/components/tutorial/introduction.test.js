import React from 'react';
import { shallow } from 'enzyme';

import { Introduction } from './introduction';

test('render', () => {
  const component = shallow(<Introduction
    description="this is a great tutorial about..."
    title="Great tutorial"
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

describe('props', () => {
  test('iconType', () => {
    const component = shallow(<Introduction
      description="this is a great tutorial about..."
      title="Great tutorial"
      iconType="logoElastic"
    />);
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('exportedFieldsUrl', () => {
    const component = shallow(<Introduction
      description="this is a great tutorial about..."
      title="Great tutorial"
      exportedFieldsUrl="exported_fields_url"
    />);
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('previewUrl', () => {
    const component = shallow(<Introduction
      description="this is a great tutorial about..."
      title="Great tutorial"
      previewUrl="preview_image_url"
    />);
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });
});
