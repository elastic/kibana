/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';
import { renderWithEuiTheme } from '@kbn/test-jest-helpers';

import { AnnouncementBanner } from './announcement_banner';

describe('Announcement', () => {
  it('renders the title', () => {
    const { getByTestId } = renderWithEuiTheme(<AnnouncementBanner title="Hello" />);
    expect(getByTestId('announcementBanner-title')).toHaveTextContent('Hello');
  });

  it('renders text and children', () => {
    const { getByText } = renderWithEuiTheme(
      <AnnouncementBanner title="Title" text="Body copy">
        <span>Extra</span>
      </AnnouncementBanner>
    );
    expect(getByText('Body copy')).toBeInTheDocument();
    expect(getByText('Extra')).toBeInTheDocument();
  });

  it('renders the media slot', () => {
    const { getByTestId } = renderWithEuiTheme(
      <AnnouncementBanner title="Title" media={<img alt="ill" data-test-subj="illustration" />} />
    );
    expect(getByTestId('announcementBanner-media')).toBeInTheDocument();
    expect(getByTestId('illustration')).toBeInTheDocument();
  });

  it('does not render the dismiss button when onDismiss is omitted', () => {
    const { queryByTestId } = renderWithEuiTheme(<AnnouncementBanner title="Title" />);
    expect(queryByTestId('announcementBanner-dismiss')).toBeNull();
  });

  it('fires onDismiss when the dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = renderWithEuiTheme(
      <AnnouncementBanner title="Title" onDismiss={onDismiss} />
    );

    fireEvent.click(getByTestId('announcementBanner-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('fires primary and secondary onClick', () => {
    const primary = jest.fn();
    const secondary = jest.fn();
    const { getByTestId } = renderWithEuiTheme(
      <AnnouncementBanner
        title="Title"
        actionProps={{
          primary: { children: 'Yes', onClick: primary },
          secondary: { children: 'No', onClick: secondary },
        }}
      />
    );

    fireEvent.click(getByTestId('announcementBanner-primaryAction'));
    fireEvent.click(getByTestId('announcementBanner-secondaryAction'));

    expect(primary).toHaveBeenCalledTimes(1);
    expect(secondary).toHaveBeenCalledTimes(1);
  });

  it('renders the title as an h2 by default', () => {
    const { getByTestId } = renderWithEuiTheme(<AnnouncementBanner title="Heading" />);
    expect(getByTestId('announcementBanner-title').tagName).toBe('H2');
  });

  it('renders the title with the requested heading element', () => {
    const { getByTestId } = renderWithEuiTheme(
      <AnnouncementBanner title="Heading" headingElement="h4" />
    );
    expect(getByTestId('announcementBanner-title').tagName).toBe('H4');
  });

  it('spreads dismissButtonProps onto the dismiss button', () => {
    const { getByTestId } = renderWithEuiTheme(
      <AnnouncementBanner
        title="Title"
        onDismiss={() => {}}
        dismissButtonProps={{ 'aria-label': 'Close', 'data-test-subj': 'custom-dismiss' }}
      />
    );
    const button = getByTestId('custom-dismiss');
    expect(button).toHaveAttribute('aria-label', 'Close');
  });

  it('respects a custom data-test-subj', () => {
    const { getByTestId } = renderWithEuiTheme(
      <AnnouncementBanner data-test-subj="hero" title="Title" />
    );
    expect(getByTestId('hero')).toBeInTheDocument();
    expect(getByTestId('hero-title')).toBeInTheDocument();
  });
});
