/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Markdown } from './markdown';
import { render, screen } from '@testing-library/react';

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

  it('renders EuiMarkdownFormat with style passed', () => {
    render(
      <Markdown style={{ color: 'red' }} data-test-subj="format" markdownContent="test" readOnly />
    );
    expect(screen.getByTestId('format')).toHaveStyle({ color: 'red' });
  });
});
