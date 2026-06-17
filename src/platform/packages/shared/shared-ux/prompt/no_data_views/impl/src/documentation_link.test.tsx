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

import { DocumentationLink } from './documentation_link';

describe('DocumentationLink', () => {
  it('renders link correctly with href', () => {
    render(<DocumentationLink href="https://example.com" />);

    // Should render the title text
    expect(screen.getByText('Want to learn more?')).toBeInTheDocument();

    // Should render a link with the correct href
    const link = screen.getByRole('link', { name: /Read the docs/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');

    // Should show the link text
    expect(screen.getByText('Read the docs')).toBeInTheDocument();
  });

  it('renders with default href when none provided', () => {
    render(<DocumentationLink />);

    // Should use default Kibana docs URL
    const link = screen.getByRole('link', { name: /Read the docs/ });
    expect(link).toHaveAttribute('href', 'https://www.elastic.co/kibana');
  });

  it('renders with custom data-test-subj', () => {
    render(<DocumentationLink href="https://example.com" data-test-subj="custom-link" />);

    // Should render with the custom test subject
    expect(screen.getByTestId('custom-link')).toBeInTheDocument();
    expect(screen.getByTestId('custom-link')).toHaveAttribute('href', 'https://example.com');
  });
});
