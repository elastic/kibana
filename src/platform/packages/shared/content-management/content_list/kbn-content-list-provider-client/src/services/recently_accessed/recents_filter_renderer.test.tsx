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
import { RecentsFilterRenderer } from './recents_filter_renderer';
import type { RecentlyAccessedHistorySource } from './types';

describe('RecentsFilterRenderer', () => {
  const buildSource = (entries: Array<{ id: string }>): RecentlyAccessedHistorySource => ({
    get: () => entries,
  });

  it('renders nothing when the recently-accessed source is empty', () => {
    const { container } = render(
      <RecentsFilterRenderer
        service={buildSource([])}
        query={Query.parse('')}
        onChange={jest.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the toggle button when the source has entries and uses the supplied label', () => {
    render(
      <RecentsFilterRenderer
        service={buildSource([{ id: 'a' }])}
        query={Query.parse('')}
        onChange={jest.fn()}
        label="Recents!"
      />
    );
    expect(screen.getByRole('button', { name: 'Recents!' })).toBeInTheDocument();
  });

  it('renders as an unpressed toggle when the filter is inactive', () => {
    render(
      <RecentsFilterRenderer
        service={buildSource([{ id: 'a' }])}
        query={Query.parse('')}
        onChange={jest.fn()}
      />
    );

    // EUI's single-filter pattern (`isToggle` + `isSelected={active}`) is what
    // gives the button its `aria-pressed` semantics — assert it directly so a
    // future regression surfaces here rather than as a screen-reader-only bug.
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders as a pressed toggle when the filter is active', () => {
    render(
      <RecentsFilterRenderer
        service={buildSource([{ id: 'a' }])}
        query={Query.parse('is:recent')}
        onChange={jest.fn()}
      />
    );

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('adds `is:recent` to the query on click when not yet active', () => {
    const onChange = jest.fn();
    render(
      <RecentsFilterRenderer
        service={buildSource([{ id: 'a' }])}
        query={Query.parse('')}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].text).toContain('is:recent');
  });

  it('removes `is:recent` from the query on click when already active', () => {
    const onChange = jest.fn();
    render(
      <RecentsFilterRenderer
        service={buildSource([{ id: 'a' }])}
        query={Query.parse('is:recent')}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].text).not.toContain('is:recent');
  });

  it('no-ops when query/onChange are not supplied (defensive)', () => {
    expect(() =>
      render(<RecentsFilterRenderer service={buildSource([{ id: 'a' }])} />)
    ).not.toThrow();
  });
});
