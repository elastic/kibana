/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Markdown } from './markdown';
import { text as specText } from 'commonmark-spec';
import { render, screen, waitFor } from '@testing-library/react';

describe('shared ux markdown component', () => {
  it('renders markdown editor by default', () => {
    render(<Markdown />);
    expect(screen.getByTestId('euiMarkdownEditorToolbar')).toBeInTheDocument();
  });

  it('renders markdown editor with tooltip action button when the prop `enableTooltipSupport` is true', () => {
    render(<Markdown enableTooltipSupport={true} />);

    expect(screen.getByLabelText('Tooltip', { selector: 'button' })).toBeInTheDocument();
  });

  it('renders for displaying a readonly message', () => {
    render(<Markdown markdownContent="error message" readOnly />);
    expect(screen.queryByTestId('euiMarkdownEditorToolbar')).not.toBeInTheDocument();
    expect(screen.getByText(/error message/i)).toBeInTheDocument();
  });

  it('will not render EuiMarkdownFormat when readOnly false and markdownContent specified', () => {
    const exampleMarkdownContent = 'error';
    render(<Markdown markdownContent={exampleMarkdownContent} />);
    expect(screen.getByTestId('euiMarkdownEditorToolbar')).toBeInTheDocument();
  });

  it('renders EuiMarkdownEditor without style passed', () => {
    render(<Markdown style={{ color: 'red' }} data-test-subj="editor" />);
    expect(screen.getByTestId('editor')).not.toHaveStyle({ color: 'red' });
  });

  it('EuiMarkdownFormat renders consistently matches to spec', async () => {
    const renderSignal = jest.fn();

    // remove language annotation of arbitrary 'example' language for code snippets in spec to prevent rendering error,
    // because EUI implementation requires that the language annotation type be registered
    // for proper syntax highlighting.
    const cleanedText = specText.replace(/\s?example\b/gm, '`text').replace(/\\/, '');

    render(
      <Markdown
        onRender={renderSignal}
        data-test-subj="spec-validation"
        markdownContent={cleanedText}
        readOnly
      />
    );

    await waitFor(() => expect(renderSignal).toHaveBeenCalled());

    expect(screen.getByTestId('spec-validation')).toMatchSnapshot();
  });

  it('renders EuiMarkdownFormat with style passed', () => {
    render(
      <Markdown style={{ color: 'red' }} data-test-subj="format" markdownContent="test" readOnly />
    );
    expect(screen.getByTestId('format')).toHaveStyle({ color: 'red' });
  });
});
