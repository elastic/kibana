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
import { Query } from '@elastic/eui';
import { StarredRenderer } from './starred_renderer';

describe('StarredRenderer', () => {
  const defaultProps = {
    query: Query.parse(''),
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with default label', () => {
      render(<StarredRenderer {...defaultProps} />);
      expect(screen.getByText('Starred')).toBeInTheDocument();
    });

    it('renders with custom name', () => {
      render(<StarredRenderer {...defaultProps} name="My Starred" />);
      expect(screen.getByText('My Starred')).toBeInTheDocument();
    });

    it('renders with default data-test-subj', () => {
      render(<StarredRenderer {...defaultProps} />);
      expect(screen.getByTestId('contentListStarredRenderer')).toBeInTheDocument();
    });

    it('renders with custom data-test-subj', () => {
      render(<StarredRenderer {...defaultProps} data-test-subj="customStarred" />);
      expect(screen.getByTestId('customStarred')).toBeInTheDocument();
    });

    it('shows empty star icon when not active', () => {
      render(<StarredRenderer {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('data-is-selected', 'true');
    });

    it('shows filled star icon when active', () => {
      const query = Query.parse('is:starred');
      render(<StarredRenderer {...defaultProps} query={query} />);
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('active state detection', () => {
    it('is not active when query is empty', () => {
      render(<StarredRenderer {...defaultProps} />);
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-pressed')).toBe('false');
    });

    it('is not active when query has other clauses', () => {
      const query = Query.parse('tag:important');
      render(<StarredRenderer {...defaultProps} query={query} />);
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-pressed')).toBe('false');
    });

    it('is active when query contains is:starred', () => {
      const query = Query.parse('is:starred');
      render(<StarredRenderer {...defaultProps} query={query} />);
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-pressed')).toBe('true');
    });

    it('is active when query contains is:starred with other clauses', () => {
      const query = Query.parse('is:starred tag:important');
      render(<StarredRenderer {...defaultProps} query={query} />);
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-pressed')).toBe('true');
    });

    it('handles undefined query gracefully', () => {
      render(<StarredRenderer onChange={jest.fn()} />);
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('toggle behavior', () => {
    it('adds is:starred clause when clicked while inactive', () => {
      const handleChange = jest.fn();
      render(<StarredRenderer query={Query.parse('')} onChange={handleChange} />);
      fireEvent.click(screen.getByRole('button'));
      expect(handleChange).toHaveBeenCalledTimes(1);
      const newQuery = handleChange.mock.calls[0][0];
      expect(newQuery.text).toContain('is:starred');
    });

    it('removes is:starred clause when clicked while active', () => {
      const handleChange = jest.fn();
      const query = Query.parse('is:starred');
      render(<StarredRenderer query={query} onChange={handleChange} />);
      fireEvent.click(screen.getByRole('button'));
      expect(handleChange).toHaveBeenCalledTimes(1);
      const newQuery = handleChange.mock.calls[0][0];
      expect(newQuery.text).not.toContain('is:starred');
    });

    it('preserves other query clauses when toggling', () => {
      const handleChange = jest.fn();
      const query = Query.parse('tag:important');
      render(<StarredRenderer query={query} onChange={handleChange} />);
      fireEvent.click(screen.getByRole('button'));
      const newQuery = handleChange.mock.calls[0][0];
      expect(newQuery.text).toContain('tag:important');
      expect(newQuery.text).toContain('is:starred');
    });

    it('does nothing when onChange is not provided', () => {
      render(<StarredRenderer query={Query.parse('')} />);
      fireEvent.click(screen.getByRole('button'));
      // No error should be thrown.
    });

    it('does nothing when query is not provided', () => {
      const handleChange = jest.fn();
      render(<StarredRenderer onChange={handleChange} />);
      fireEvent.click(screen.getByRole('button'));
      expect(handleChange).not.toHaveBeenCalled();
    });
  });
});
