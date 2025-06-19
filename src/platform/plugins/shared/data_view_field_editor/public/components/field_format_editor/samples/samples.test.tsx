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
import { FormatEditorSamples } from './samples';

import { DiscoverTestProvider } from '@kbn/discover-plugin/public/__mocks__/test_provider';

describe('FormatEditorSamples', () => {
  it('should render normally', () => {
    render(
      <DiscoverTestProvider>
        <FormatEditorSamples
          samples={[
            { input: 'test', output: 'TEST' },
            { input: 123, output: '456' },
            { input: ['foo', 'bar'], output: '<span>foo</span>, <span>bar</span>' },
          ]}
        />
      </DiscoverTestProvider>
    );

    expect(screen.getByRole('table')).toBeInTheDocument();

    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.getByText('Output')).toBeInTheDocument();

    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('TEST')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
    expect(screen.getByText('456')).toBeInTheDocument();
    expect(screen.getByText('["foo","bar"]')).toBeInTheDocument();
  });

  it('should render nothing if there are no samples', () => {
    const { container } = render(
      <DiscoverTestProvider>
        <FormatEditorSamples samples={[]} />
      </DiscoverTestProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
