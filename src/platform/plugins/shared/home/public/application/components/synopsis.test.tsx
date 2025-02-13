/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';

import { Synopsis } from './synopsis';

test('render', () => {
  const component = render(
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
    const component = render(
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
    const component = render(
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
    const component = render(
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
