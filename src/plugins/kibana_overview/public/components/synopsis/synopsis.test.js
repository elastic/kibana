/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { Synopsis } from './synopsis';

test('render', () => {
  const component = shallow(
    <Synopsis
      id={'tutorial'}
      description="this is a great tutorial about..."
      title="Great tutorial"
      url="link_to_item"
    />
  );
  expect(component).toMatchSnapshot();
});

describe('props', () => {
  test('iconType', () => {
    const component = shallow(
      <Synopsis
        id={'tutorial'}
        description="this is a great tutorial about..."
        title="Great tutorial"
        url="link_to_item"
        iconType="logoApache"
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('iconUrl', () => {
    const component = shallow(
      <Synopsis
        id={'tutorial'}
        description="this is a great tutorial about..."
        title="Great tutorial"
        url="link_to_item"
        iconUrl="icon_url"
      />
    );
    expect(component).toMatchSnapshot();
  });

  test('isBeta', () => {
    const component = shallow(
      <Synopsis
        id={'tutorial'}
        description="this is a great tutorial about..."
        title="Great tutorial"
        url="link_to_item"
        isBeta={true}
      />
    );
    expect(component).toMatchSnapshot();
  });
});
