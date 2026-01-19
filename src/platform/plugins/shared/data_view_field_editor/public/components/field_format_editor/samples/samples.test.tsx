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
import { I18nProvider } from '@kbn/i18n-react';
import { FormatEditorSamples } from './samples';

describe('FormatEditorSamples', () => {
  it('should render normally', () => {
    render(
      <I18nProvider>
        <FormatEditorSamples
          samples={[
            { input: 'test', output: 'TEST' },
            { input: 123, output: '456' },
            { input: ['foo', 'bar'], output: '<span>foo</span>, <span>bar</span>' },
          ]}
        />
      </I18nProvider>
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
      <I18nProvider>
        <FormatEditorSamples samples={[]} />
      </I18nProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });
});
