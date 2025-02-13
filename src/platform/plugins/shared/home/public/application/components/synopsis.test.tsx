/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Synopsis, SynopsisProps } from './synopsis';

const defaultProps: SynopsisProps = {
  id: 'tutorial',
  description: 'this is a great tutorial about...',
  title: 'Great tutorial',
  url: 'link_to_item',
};
describe('Synopsis component', () => {
  test('renders with default props', () => {
    render(<Synopsis {...defaultProps} />);

    // Check if the title is rendered
    expect(screen.getByText('Great tutorial')).toBeInTheDocument();

    // Check if the description is rendered
    expect(screen.getByText('this is a great tutorial about...')).toBeInTheDocument();

    // Check if the card element is rendered
    expect(screen.getByTestId('homeSynopsisLinktutorial')).toBeInTheDocument();
  });
  test('renders with iconType', () => {
    render(<Synopsis {...defaultProps} iconType="logoApache" />);

    // Check if the icon is rendered
    expect(screen.getByTitle('')).toBeInTheDocument();
  });

  test('renders with iconUrl', () => {
    render(<Synopsis {...defaultProps} iconUrl="icon_url" />);

    // Check if the image is rendered
    expect(screen.getByAltText('')).toBeInTheDocument();
  });

  test('renders with isBeta', () => {
    render(<Synopsis {...defaultProps} isBeta={true} />);

    // Check if the beta badge is rendered
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });
});
