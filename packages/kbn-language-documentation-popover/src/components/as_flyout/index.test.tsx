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
import { LanguageDocumentationFlyout } from '.';

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
            description: (
              <Markdown readOnly markdownContent={`## Section three item 1 description `} />
            ),
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
  const renderFlyout = (linkToDocumentation?: string) => {
    return render(
      <LanguageDocumentationFlyout
        isHelpMenuOpen={true}
        onHelpMenuVisibilityChange={jest.fn()}
        sections={sections}
        linkToDocumentation={linkToDocumentation}
      />
    );
  };
  it('has a header element for navigation through the sections', () => {
    renderFlyout();
    expect(screen.getByTestId('language-documentation-navigation-search')).toBeInTheDocument();
    expect(screen.getByTestId('language-documentation-navigation-dropdown')).toBeInTheDocument();
    expect(screen.queryByTestId('language-documentation-navigation-link')).not.toBeInTheDocument();
  });

  it('has a link if linkToDocumentation prop is given', () => {
    renderFlyout('meow');
    expect(screen.getByTestId('language-documentation-navigation-link')).toBeInTheDocument();
  });

  it('contains the two last sections', () => {
    renderFlyout();
    expect(screen.getByText('Section two')).toBeInTheDocument();
    expect(screen.getByText('Section three')).toBeInTheDocument();
  });

  it('contains the correct section if user updates the search input', () => {
    renderFlyout();
    const input = screen.getByTestId('language-documentation-navigation-search');
    fireEvent.change(input, { target: { value: 'two' } });
    expect(screen.getByText('Section two')).toBeInTheDocument();
  });
});
