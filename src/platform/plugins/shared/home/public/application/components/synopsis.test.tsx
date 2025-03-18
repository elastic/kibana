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
import { Synopsis, SynopsisProps } from './synopsis';

const defaultProps: SynopsisProps = {
  id: 'tutorial',
  description: 'this is a great tutorial about...',
  title: 'Great tutorial',
  url: 'link_to_item',
};
describe('Synopsis component', () => {
  test('renders with default props', () => {
    const { getByText, getByTestId } = render(<Synopsis {...defaultProps} />);

    expect(getByText('Great tutorial')).toBeInTheDocument();
    expect(getByText('this is a great tutorial about...')).toBeInTheDocument();
    expect(getByTestId('homeSynopsisLinktutorial')).toBeInTheDocument();
  });

  test('renders with iconType', () => {
    const { container } = render(<Synopsis {...defaultProps} iconType="logoApache" />);

    const icon = container.querySelector('[data-euiicon-type="logoApache"]');
    expect(icon).toBeInTheDocument();
  });

  test('renders with iconUrl', () => {
    const { container } = render(<Synopsis {...defaultProps} iconUrl="icon_url" />);

    const imgElement = container.querySelector('.synopsisIcon');
    expect(imgElement).toHaveAttribute('src', 'icon_url');
  });

  test('renders with isBeta', () => {
    const { getByText } = render(<Synopsis {...defaultProps} isBeta={true} />);

    expect(getByText('Beta')).toBeInTheDocument();
  });
});
