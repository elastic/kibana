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
import { EuiTextProps } from '@elastic/eui';

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

  it('applies the default textSize when not provided', () => {
    const { container } = render(<HighlightField value="Test Value" />);
    const textElement = container.querySelector('.euiText');
    expect(textElement).toHaveClass('eui-textTruncate');
    expect(textElement).toHaveAttribute('size', 'xs');
  });

  it('applies the specified textSize when provided', () => {
    const textSize: EuiTextProps['size'] = 'm';
    const { container } = render(<HighlightField value="Test Value" textSize={textSize} />);
    const textElement = container.querySelector('.euiText');
    expect(textElement).toHaveAttribute('size', textSize);
  });

  it('renders nothing when neither value nor formattedValue is provided', () => {
    const { container } = render(<HighlightField />);
    expect(container.firstChild).toBeNull();
  });
});
