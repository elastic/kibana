/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, render, fireEvent, waitFor } from '@testing-library/react';
import { Markdown } from '@kbn/shared-ux-markdown';
import { LanguageDocumentationInline } from '.';

const mockMarkDownDescription = () => (
  <Markdown markdownContent="Section three item 1 blah blah blah" />
);

jest.mock('../../sections', () => {
  const module = jest.requireActual('../../sections');
  return {
    ...module,
    getESQLDocsSections: () => ({
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
              description: 'Section two item 1 description',
            },
            {
              label: 'Section two item 2',
              description: 'Section two item 2 description',
            },
          ],
        },
        {
          label: 'Section three',
          items: [
            {
              label: 'Section three item 1',
              description: mockMarkDownDescription(),
            },
            {
              label: 'Section three item 2',
              description: 'Section three item 2 description',
            },
          ],
        },
      ],
      initialSection: <span>Here is the initial section</span>,
    }),
  };
});

describe('###Documentation flyout component', () => {
  const renderInlineComponent = (searchInDescription = false) => {
    return render(
      <LanguageDocumentationInline searchInDescription={searchInDescription} height={80} />
    );
  };
  it('has a header element for navigation through the sections', () => {
    renderInlineComponent();
    expect(screen.getByTestId('language-documentation-navigation-search')).toBeInTheDocument();
    expect(screen.getByTestId('language-documentation-navigation-dropdown')).toBeInTheDocument();
  });

  it('contains the two last sections', async () => {
    renderInlineComponent();
    await waitFor(() => {
      expect(screen.getByText('Section two')).toBeInTheDocument();
      expect(screen.getByText('Section three')).toBeInTheDocument();
    });
  });

  it('contains the correct section if user updates the search input', async () => {
    renderInlineComponent();
    const input = screen.getByTestId('language-documentation-navigation-search');
    fireEvent.change(input, { target: { value: 'two' } });
    await waitFor(() => {
      expect(screen.getByText('Section two')).toBeInTheDocument();
    });
  });

  it('contains the correct section if user updates the search input with a text that exist in the description', async () => {
    renderInlineComponent(true);
    const input = screen.getByTestId('language-documentation-navigation-search');
    fireEvent.change(input, { target: { value: 'blah' } });
    await waitFor(() => {
      expect(screen.getByText('Section three')).toBeInTheDocument();
    });
  });
});
