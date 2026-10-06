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

const panel = () => screen.getByTestId('ESQLEditor-history-panel-slide');

const fireTransitionEnd = (target: HTMLElement) => {
  const event = new Event('transitionend', { bubbles: true });
  Object.defineProperty(event, 'propertyName', { value: 'grid-template-rows' });
  target.dispatchEvent(event);
};

describe('HistoryPanelSlide', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('stays unmounted while recent queries are hidden', () => {
    render(
      <HistoryPanelSlide isOpen={false}>
        <div>Recent queries</div>
      </HistoryPanelSlide>
    );

    expect(screen.queryByText('Recent queries')).not.toBeInTheDocument();
  });

  it('slides open after painting a collapsed frame', async () => {
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

    expect(panel()).toHaveAttribute('data-expanded', 'false');

    await act(async () => {
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(undefined)));
    });

    expect(panel()).toHaveAttribute('data-expanded', 'true');
  });

  it('stays mounted until its own slide-out finishes', () => {
    const { rerender } = render(
      <HistoryPanelSlide isOpen>
        <div data-test-subj="child">Recent queries</div>
      </HistoryPanelSlide>
    );

    rerender(
      <HistoryPanelSlide isOpen={false}>
        <div data-test-subj="child">Recent queries</div>
      </HistoryPanelSlide>
    );
    expect(panel()).toHaveAttribute('data-expanded', 'false');

    act(() => {
      fireTransitionEnd(screen.getByTestId('child'));
    });
    expect(screen.getByText('Recent queries')).toBeInTheDocument();

    act(() => {
      fireTransitionEnd(panel());
    });
    expect(screen.queryByText('Recent queries')).not.toBeInTheDocument();
  });

  it('unmounts at once when closed before it expanded', () => {
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
    rerender(
      <HistoryPanelSlide isOpen={false}>
        <div>Recent queries</div>
      </HistoryPanelSlide>
    );

    expect(screen.queryByText('Recent queries')).not.toBeInTheDocument();
  });

  it('unmounts at once when reduced motion is preferred', () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
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
