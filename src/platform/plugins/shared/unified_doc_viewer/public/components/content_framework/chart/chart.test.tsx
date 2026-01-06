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
import type { ContentFrameworkChartProps } from '.';
import { ContentFrameworkChart } from '.';

jest.mock('../../../plugin', () => ({
  getUnifiedDocViewerServices: () => ({
    share: {
      url: {
        locators: {
          get: () => ({
            getRedirectUrl: jest.fn(() => 'http://discover-url'),
          }),
        },
      },
    },
    data: {
      query: {
        timefilter: {
          timefilter: {
            getAbsoluteTime: jest.fn(() => ({ from: 'now-15m', to: 'now' })),
          },
        },
      },
    },
  }),
}));

describe('ContentFrameworkChart', () => {
  const defaultProps: ContentFrameworkChartProps = {
    'data-test-subj': 'test-chart',
    title: 'Chart Title',
    description: 'Chart description',
    esqlQuery: 'SELECT * FROM test',
    children: <div>Chart content</div>,
  };

  it('renders the title', () => {
    render(<ContentFrameworkChart {...defaultProps} />);
    expect(screen.getByText('Chart Title')).toBeInTheDocument();
  });

  it('renders the description', async () => {
    render(<ContentFrameworkChart {...defaultProps} />);
    expect(screen.getByText('Chart description')).toBeInTheDocument();
  });

  it('renders the Open in Discover button if esqlQuery and discoverUrl exist', () => {
    render(<ContentFrameworkChart {...defaultProps} />);
    const discoverBtn = screen.getByTestId('ContentFrameworkChartOpenInDiscover');
    expect(discoverBtn).toBeInTheDocument();
    expect(discoverBtn).toHaveAttribute('href', 'http://discover-url');
  });

  it('does not render the Discover button if esqlQuery is missing', () => {
    render(<ContentFrameworkChart {...defaultProps} esqlQuery={undefined} />);
    expect(screen.queryByTestId('ContentFrameworkChartOpenInDiscover')).not.toBeInTheDocument();
  });

  it('renders children content', () => {
    render(<ContentFrameworkChart {...defaultProps} />);
    expect(screen.getByText('Chart content')).toBeInTheDocument();
  });

  it('sets the correct data-test-subj on the root element', () => {
    render(<ContentFrameworkChart {...defaultProps} />);
    expect(screen.getByTestId('test-chart')).toBeInTheDocument();
  });
});
