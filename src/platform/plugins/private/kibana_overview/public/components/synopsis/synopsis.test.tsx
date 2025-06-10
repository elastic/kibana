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

describe('Synopsis component', () => {
  test('renders', () => {
    const { getByText } = render(
      <Synopsis
        id={'tutorial'}
        description="this is a great tutorial about..."
        title="Great tutorial"
        url="link_to_item"
        wrapInPanel
      />
    );
    expect(getByText('this is a great tutorial about...')).toBeInTheDocument();
  });

  test('iconType', () => {
    const { container } = render(
      <Synopsis
        id={'tutorial'}
        description="this is a great tutorial about..."
        title="Great tutorial"
        url="link_to_item"
        iconType="logoApache"
        wrapInPanel
      />
    );

    const icon = container.querySelector('[data-euiicon-type="logoApache"]');
    expect(icon).toBeInTheDocument();
  });

  test('iconUrl', () => {
    const { getByRole } = render(
      <Synopsis
        id={'tutorial'}
        description="this is a great tutorial about..."
        title="Great tutorial"
        url="link_to_item"
        iconUrl="icon_url"
        wrapInPanel
      />
    );
    const anchorElement = getByRole('link', {
      name: 'Great tutorial',
    });
    expect(anchorElement).toHaveAttribute('href', 'link_to_item');
  });

  test('isBeta', () => {
    const { getByText } = render(
      <Synopsis
        id={'tutorial'}
        description="this is a great tutorial about..."
        title="Great tutorial"
        url="link_to_item"
        isBeta={true}
        wrapInPanel
      />
    );
    expect(getByText('Beta')).toBeInTheDocument();
  });
});
