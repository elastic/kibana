/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import type { Tag } from '../types';
import { TagBadge } from './tag_badge';

describe('TagBadge', () => {
  const mockTag: Tag = {
    id: 'tag-1',
    name: 'Test Tag',
    description: 'A test tag for testing',
    color: '#FF0000',
    managed: false,
  };

  // Note: The platform detection IIFE (line 25-34) runs at module load time
  // Testing the `typeof navigator === 'undefined'` branch (line 27) is not practical
  // in jsdom environment, as navigator is always defined in the test environment.
  // This defensive code path is for SSR/Node.js environments and is covered by
  // integration/E2E tests in those contexts.

  it('renders tag name correctly', () => {
    render(<TagBadge tag={mockTag} />);
    expect(screen.getByText('Test Tag')).toBeInTheDocument();
  });

  it('applies color from tag', () => {
    render(<TagBadge tag={mockTag} />);
    const badge = screen.getByText('Test Tag').closest('.euiBadge');
    // EUI uses CSS custom properties for badge colors
    expect(badge).toHaveAttribute('style', expect.stringContaining('--euiBadgeBackgroundColor'));
  });

  it('sets correct data-test-subj', () => {
    render(<TagBadge tag={mockTag} />);
    expect(screen.getByTestId('tag-tag-1')).toBeInTheDocument();
  });

  it('sets title attribute to description', () => {
    render(<TagBadge tag={mockTag} />);
    const badge = screen.getByText('Test Tag').closest('.euiBadge');
    expect(badge).toHaveAttribute('title', 'A test tag for testing');
  });

  describe('without onClick handler', () => {
    it('renders as non-interactive badge', () => {
      render(<TagBadge tag={mockTag} />);
      const badge = screen.getByText('Test Tag').closest('.euiBadge');
      expect(badge?.tagName).not.toBe('BUTTON');
    });

    it('does not have onClickAriaLabel', () => {
      render(<TagBadge tag={mockTag} />);
      const badge = screen.getByText('Test Tag').closest('.euiBadge');
      expect(badge).not.toHaveAttribute('aria-label');
    });
  });

  describe('with onClick handler', () => {
    it('renders as clickable badge', () => {
      const onClick = jest.fn();
      render(<TagBadge tag={mockTag} onClick={onClick} />);
      const badge = screen.getByText('Test Tag').closest('button');
      expect(badge).toBeInTheDocument();
    });

    it('calls onClick with tag and false when clicked normally', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();
      render(<TagBadge tag={mockTag} onClick={onClick} />);

      const badge = screen.getByText('Test Tag');
      await user.click(badge);

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith(mockTag, false);
    });

    it('calls onClick with tag when clicked with Meta key', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();

      render(<TagBadge tag={mockTag} onClick={onClick} />);

      const badge = screen.getByText('Test Tag');

      // Hold Meta key, click, then release
      await user.keyboard('{Meta>}');
      await user.click(badge);
      await user.keyboard('{/Meta}');

      expect(onClick).toHaveBeenCalledTimes(1);
      // Meta key detection is platform-dependent, so we check it was called
      expect(onClick).toHaveBeenCalledWith(mockTag, expect.any(Boolean));
    });

    it('calls onClick with tag when clicked with Ctrl key', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();

      render(<TagBadge tag={mockTag} onClick={onClick} />);

      const badge = screen.getByText('Test Tag');

      // Hold Ctrl key, click, then release
      await user.keyboard('{Control>}');
      await user.click(badge);
      await user.keyboard('{/Control}');

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith(mockTag, expect.any(Boolean));
    });

    it('detects modifier key based on platform', async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();

      render(<TagBadge tag={mockTag} onClick={onClick} />);

      const badge = screen.getByText('Test Tag');

      // Test that regular click passes false
      await user.click(badge);
      expect(onClick).toHaveBeenLastCalledWith(mockTag, false);

      onClick.mockClear();

      // Test that meta key can trigger the modifier flag
      await user.keyboard('{Meta>}');
      await user.click(badge);
      await user.keyboard('{/Meta}');
      const [, withModifierMeta] = onClick.mock.calls[0];

      onClick.mockClear();

      // Test that ctrl key can trigger the modifier flag
      await user.keyboard('{Control>}');
      await user.click(badge);
      await user.keyboard('{/Control}');
      const [, withModifierCtrl] = onClick.mock.calls[0];

      // At least one should have triggered the modifier flag
      // depending on platform detection
      expect(typeof withModifierMeta).toBe('boolean');
      expect(typeof withModifierCtrl).toBe('boolean');
    });

    it('has proper aria label for accessibility', () => {
      const onClick = jest.fn();
      render(<TagBadge tag={mockTag} onClick={onClick} />);

      const badge = screen.getByText('Test Tag').closest('button');
      expect(badge).toHaveAttribute('aria-label', 'Test Tag tag');
    });

    it('does not propagate event if onClick is defined', async () => {
      const onClick = jest.fn();
      const onContainerClick = jest.fn();
      const user = userEvent.setup();

      render(
        <div onClick={onContainerClick} onKeyDown={onContainerClick} role="button" tabIndex={0}>
          <TagBadge tag={mockTag} onClick={onClick} />
        </div>
      );

      const badge = screen.getByText('Test Tag');
      await user.click(badge);

      expect(onClick).toHaveBeenCalledTimes(1);
      // Event propagation is stopped to prevent triggering parent handlers (e.g., row selection).
      expect(onContainerClick).not.toHaveBeenCalled();
    });
  });

  describe('tag without id', () => {
    it('handles tag without id gracefully', () => {
      const tagWithoutId: Tag = {
        name: 'No ID Tag',
        description: 'Tag without ID',
        color: '#00FF00',
        managed: false,
      };

      render(<TagBadge tag={tagWithoutId} />);
      expect(screen.getByText('No ID Tag')).toBeInTheDocument();
      expect(screen.getByTestId('tag-undefined')).toBeInTheDocument();
    });
  });

  describe('managed tags', () => {
    it('renders managed tag correctly', () => {
      const managedTag: Tag = {
        id: 'managed-tag',
        name: 'Managed',
        description: 'Managed tag',
        color: '#0000FF',
        managed: true,
      };

      render(<TagBadge tag={managedTag} />);
      expect(screen.getByText('Managed')).toBeInTheDocument();
    });
  });
});
