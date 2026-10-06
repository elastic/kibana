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

  it('unmounts after the slide-out, or immediately when motion is reduced', () => {
    const view = render(
      <HistoryPanelSlide isOpen>
        <div>Recent queries</div>
      </HistoryPanelSlide>
    );

    view.rerender(
      <HistoryPanelSlide isOpen={false}>
        <div>Recent queries</div>
      </HistoryPanelSlide>
    );
    expect(screen.getByText('Recent queries')).toBeInTheDocument();

    act(() => {
      const event = new Event('transitionend', { bubbles: true });
      Object.defineProperty(event, 'propertyName', { value: 'grid-template-rows' });
      panel().dispatchEvent(event);
    });
    expect(screen.queryByText('Recent queries')).not.toBeInTheDocument();

    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    view.rerender(
      <HistoryPanelSlide isOpen>
        <div>Recent queries</div>
      </HistoryPanelSlide>
    );
    view.rerender(
      <HistoryPanelSlide isOpen={false}>
        <div>Recent queries</div>
      </HistoryPanelSlide>
    );
    expect(screen.queryByText('Recent queries')).not.toBeInTheDocument();
  });
});
