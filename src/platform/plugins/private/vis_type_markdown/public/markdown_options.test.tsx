/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VisEditorOptionsProps } from '@kbn/visualizations-plugin/public';
import { MarkdownVisParams } from './types';
import { MarkdownOptions } from './markdown_options';
import { I18nProvider } from '@kbn/i18n-react';

describe('MarkdownOptions', () => {
  const defaultProps = {
    stateParams: {
      fontSize: 12,
      markdown: 'hello from 2020 🥳',
      openLinksInNewTab: false,
    },
    setValue: jest.fn(),
  } as unknown as VisEditorOptionsProps<MarkdownVisParams>;

  it('should match snapshot', () => {
    const { container } = render(<MarkdownOptions {...defaultProps} />, { wrapper: I18nProvider });
    expect(container).toMatchSnapshot();
  });

  it('should update markdown on change', () => {
    render(<MarkdownOptions {...defaultProps} />, { wrapper: I18nProvider });

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    const newValue = 'see you in 2021 😎';

    fireEvent.change(textarea, { target: { value: newValue } });

    expect(defaultProps.setValue).toHaveBeenCalledWith('markdown', newValue);
  });
});
