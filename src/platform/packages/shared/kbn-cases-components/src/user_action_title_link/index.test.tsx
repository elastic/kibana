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

import { UserActionTitleLink } from '.';
import { LINK_LOADING_ARIA_LABEL } from './translations';

const defaultProps = {
  dataTestSubj: 'test-id',
  targetId: 'entity-123',
  label: 'My Entity',
  getHref: jest.fn().mockReturnValue('https://example.com'),
  onClick: jest.fn(),
};

describe('UserActionTitleLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a clickable link when targetId and getHref are provided', () => {
    render(<UserActionTitleLink {...defaultProps} />);

    const link = screen.getByTestId('test-id');
    expect(link).toHaveTextContent('My Entity');
    expect(link).toHaveAttribute('href', 'https://example.com');
  });

  it('renders a clickable link when onClick is provided but getHref is not', () => {
    render(<UserActionTitleLink {...defaultProps} getHref={undefined} />);

    expect(screen.getByTestId('test-id')).toHaveTextContent('My Entity');
  });

  it('renders a clickable link when getHref is provided but onClick is not', () => {
    render(<UserActionTitleLink {...defaultProps} onClick={undefined} />);

    expect(screen.getByTestId('test-id')).toHaveTextContent('My Entity');
  });

  it('renders plain text when neither getHref nor onClick is provided', () => {
    render(<UserActionTitleLink {...defaultProps} getHref={undefined} onClick={undefined} />);

    expect(screen.queryByTestId('test-id')).not.toBeInTheDocument();
    expect(screen.getByText('My Entity')).toBeInTheDocument();
  });

  it('renders plain text when targetId is null', () => {
    render(<UserActionTitleLink {...defaultProps} targetId={null} />);

    expect(screen.queryByTestId('test-id')).not.toBeInTheDocument();
    expect(screen.getByText('My Entity')).toBeInTheDocument();
  });

  it('renders plain text when targetId is empty string', () => {
    render(<UserActionTitleLink {...defaultProps} targetId="" />);

    expect(screen.queryByTestId('test-id')).not.toBeInTheDocument();
    expect(screen.getByText('My Entity')).toBeInTheDocument();
  });

  it('renders the fallbackLabel when label is null', () => {
    render(<UserActionTitleLink {...defaultProps} label={null} fallbackLabel="Unknown rule" />);

    expect(screen.getByTestId('test-id')).toHaveTextContent('Unknown rule');
  });

  it('renders the default "Unknown" fallback when label and fallbackLabel are null', () => {
    render(<UserActionTitleLink {...defaultProps} label={null} fallbackLabel={undefined} />);

    expect(screen.getByTestId('test-id')).toHaveTextContent('Unknown');
  });

  it('shows a loading spinner when isLoading is true', () => {
    render(<UserActionTitleLink {...defaultProps} isLoading />);

    const spinner = screen.getByTestId('user-action-link-loading');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', LINK_LOADING_ARIA_LABEL);
    expect(screen.queryByTestId('test-id')).not.toBeInTheDocument();
  });

  it('calls onClick with targetId when the link is clicked', () => {
    render(<UserActionTitleLink {...defaultProps} />);

    fireEvent.click(screen.getByTestId('test-id'));
    expect(defaultProps.onClick).toHaveBeenCalledWith('entity-123', expect.any(Object));
  });

  it('calls getHref with the targetId', () => {
    render(<UserActionTitleLink {...defaultProps} />);

    expect(defaultProps.getHref).toHaveBeenCalledWith('entity-123');
  });
});
