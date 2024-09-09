/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, render, fireEvent } from '@testing-library/react';
import { Markdown } from '@kbn/shared-ux-markdown';
import { LanguageDocumentationInline } from '.';

describe('###Documentation flyout component', () => {
  const sections = {
    groups: [
      {
        label: 'Section one',
        description: 'Section 1 description',
        items: [],
      },
      {
        label: 'Section two',
        items: [
          {
            label: 'Section two item 1',
            description: (
              <Markdown readOnly markdownContent={`## Section two item 1 description `} />
            ),
          },
          {
            label: 'Section two item 2',
            description: (
              <Markdown readOnly markdownContent={`## Section two item 2 description `} />
            ),
          },
        ],
      },
      {
        label: 'Section three',
        items: [
          {
            label: 'Section three item 1',
            description: <Markdown readOnly markdownContent={`## Section three blah blah `} />,
          },
          {
            label: 'Section three item 2',
            description: (
              <Markdown readOnly markdownContent={`## Section three item 2 description `} />
            ),
          },
        ],
      },
    ],
    initialSection: <span>Here is the initial section</span>,
  };
  const renderInlineComponent = (searchInDescription = false) => {
    return render(
      <LanguageDocumentationInline sections={sections} searchInDescription={searchInDescription} />
    );
  };
  it('has a header element for navigation through the sections', () => {
    renderInlineComponent();
    expect(screen.getByTestId('language-documentation-navigation-search')).toBeInTheDocument();
    expect(screen.getByTestId('language-documentation-navigation-dropdown')).toBeInTheDocument();
  });

  it('contains the two last sections', () => {
    renderInlineComponent();
    expect(screen.getByText('Section two')).toBeInTheDocument();
    expect(screen.getByText('Section three')).toBeInTheDocument();
  });

  it('contains the correct section if user updates the search input', () => {
    renderInlineComponent();
    const input = screen.getByTestId('language-documentation-navigation-search');
    fireEvent.change(input, { target: { value: 'two' } });
    expect(screen.getByText('Section two')).toBeInTheDocument();
  });

  it('contains the correct section if user updates the search input with a text that exist in the description', () => {
    renderInlineComponent(true);
    const input = screen.getByTestId('language-documentation-navigation-search');
    fireEvent.change(input, { target: { value: 'blah' } });
    expect(screen.getByText('Section three')).toBeInTheDocument();
  });
});
