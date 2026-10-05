/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { HistoryPanelSlide } from './history_panel_slide';

describe('HistoryPanelSlide', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('does not render the panel while recent queries are hidden', () => {
    render(
      <HistoryPanelSlide isOpen={false}>
        <div>Recent queries</div>
      </HistoryPanelSlide>
    );

    expect(screen.queryByText('Recent queries')).not.toBeInTheDocument();
  });

  it('renders an expanded panel when recent queries start open', () => {
    render(
      <HistoryPanelSlide isOpen>
        <div>Recent queries</div>
      </HistoryPanelSlide>
    );

    expect(screen.getByText('Recent queries')).toBeInTheDocument();
    expect(screen.getByTestId('ESQLEditor-history-panel-slide')).toHaveAttribute(
      'data-expanded',
      'true'
    );
  });

  it('mounts collapsed, then slides open', async () => {
    const { rerender } = render(
      <HistoryPanelSlide isOpen={false}>
        <div>Recent queries</div>
      </HistoryPanelSlide>
    );

    rerender(
      <HistoryPanelSlide isOpen>
        <div>Recent queries</div>
      </HistoryPanelSlide>
    );

    expect(screen.getByTestId('ESQLEditor-history-panel-slide')).toHaveAttribute(
      'data-expanded',
      'false'
    );

    await act(async () => {
      await new Promise((resolve) => {
        window.requestAnimationFrame(() => resolve(undefined));
      });
    });

    expect(screen.getByText('Recent queries')).toBeInTheDocument();
    expect(screen.getByTestId('ESQLEditor-history-panel-slide')).toHaveAttribute(
      'data-expanded',
      'true'
    );
  });

  it('keeps the panel mounted until the slide-out finishes', () => {
    const { rerender } = render(
      <HistoryPanelSlide isOpen>
        <div>Recent queries</div>
      </HistoryPanelSlide>
    );

    rerender(
      <HistoryPanelSlide isOpen={false}>
        <div>Recent queries</div>
      </HistoryPanelSlide>
    );

    const panel = screen.getByTestId('ESQLEditor-history-panel-slide');
    expect(screen.getByText('Recent queries')).toBeInTheDocument();
    expect(panel).toHaveAttribute('data-expanded', 'false');

    act(() => {
      const event = new Event('transitionend', { bubbles: true });
      Object.defineProperty(event, 'propertyName', { value: 'grid-template-rows' });
      panel.dispatchEvent(event);
    });

    expect(screen.queryByText('Recent queries')).not.toBeInTheDocument();
  });

  it('removes the panel immediately when reduced motion is preferred', () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const { rerender } = render(
      <HistoryPanelSlide isOpen>
        <div>Recent queries</div>
      </HistoryPanelSlide>
    );

    rerender(
      <HistoryPanelSlide isOpen={false}>
        <div>Recent queries</div>
      </HistoryPanelSlide>
    );

    expect(screen.queryByText('Recent queries')).not.toBeInTheDocument();
  });
});
