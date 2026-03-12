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
import { HighlightField } from '.';

describe('HighlightField', () => {
  it('renders the value when formattedValue is not provided', () => {
    const { getByText } = render(<HighlightField value="Test Value" />);
    expect(getByText('Test Value')).toBeInTheDocument();
  });

  it('renders the formattedValue when provided', () => {
    const { container } = render(<HighlightField formattedValue="<b>Formatted Value</b>" />);
    expect(container.querySelector('b')).toHaveTextContent('Formatted Value');
  });

  it('renders children as a function when provided', () => {
    const { getByText } = render(
      <HighlightField
        formattedValue="<b>Formatted Value</b>"
        children={({ content }) => <div>{content}</div>}
      />
    );
    expect(getByText('Formatted Value')).toBeInTheDocument();
  });

  it('renders nothing when neither value nor formattedValue is provided', () => {
    const { container } = render(<HighlightField />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the formattedValue with a custom HTML element when "as" prop is provided', () => {
    const { container } = render(
      <HighlightField formattedValue="<b>Formatted Value</b>" as="span" />
    );
    const spanElement = container.querySelector('span');
    expect(spanElement).toHaveTextContent('Formatted Value');
  });

  it('renders valueContent when formattedValue is not provided', () => {
    const { getByText } = render(<HighlightField value="Fallback Value" />);
    expect(getByText('Fallback Value')).toBeInTheDocument();
  });
});
