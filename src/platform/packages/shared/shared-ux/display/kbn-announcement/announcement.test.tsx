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

import { Announcement } from './announcement';

describe('Announcement', () => {
  it('renders the title', () => {
    const { getByTestId } = renderWithEuiTheme(<Announcement title="Hello" />);
    expect(getByTestId('announcement-title')).toHaveTextContent('Hello');
  });

  it('renders text and children', () => {
    const { getByText } = renderWithEuiTheme(
      <Announcement title="Title" text="Body copy">
        <span>Extra</span>
      </Announcement>
    );
    expect(getByText('Body copy')).toBeInTheDocument();
    expect(getByText('Extra')).toBeInTheDocument();
  });

  it('renders the media slot', () => {
    const { getByTestId } = renderWithEuiTheme(
      <Announcement title="Title" media={<img alt="ill" data-test-subj="illustration" />} />
    );
    expect(getByTestId('announcement-media')).toBeInTheDocument();
    expect(getByTestId('illustration')).toBeInTheDocument();
  });

  it('does not render the dismiss button when onDismiss is omitted', () => {
    const { queryByTestId } = renderWithEuiTheme(<Announcement title="Title" />);
    expect(queryByTestId('announcement-dismiss')).toBeNull();
  });

  it('fires onDismiss when the dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = renderWithEuiTheme(
      <Announcement title="Title" onDismiss={onDismiss} />
    );

    fireEvent.click(getByTestId('announcement-dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('fires primary and secondary onClick', () => {
    const primary = jest.fn();
    const secondary = jest.fn();
    const { getByTestId } = renderWithEuiTheme(
      <Announcement
        title="Title"
        actionProps={{
          primary: { children: 'Yes', onClick: primary },
          secondary: { children: 'No', onClick: secondary },
        }}
      />
    );

    fireEvent.click(getByTestId('announcement-primaryAction'));
    fireEvent.click(getByTestId('announcement-secondaryAction'));

    expect(primary).toHaveBeenCalledTimes(1);
    expect(secondary).toHaveBeenCalledTimes(1);
  });

  it('renders the title as an h2 by default', () => {
    const { getByTestId } = renderWithEuiTheme(<Announcement title="Heading" />);
    expect(getByTestId('announcement-title').tagName).toBe('H2');
  });

  it('renders the title with the requested heading element', () => {
    const { getByTestId } = renderWithEuiTheme(
      <Announcement title="Heading" headingElement="h4" />
    );
    expect(getByTestId('announcement-title').tagName).toBe('H4');
  });

  it('spreads dismissButtonProps onto the dismiss button', () => {
    const { getByTestId } = renderWithEuiTheme(
      <Announcement
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
      <Announcement data-test-subj="hero" title="Title" />
    );
    expect(getByTestId('hero')).toBeInTheDocument();
    expect(getByTestId('hero-title')).toBeInTheDocument();
  });
});
