/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { InspectHighlight } from './inspect_highlight';

describe('InspectHighlight', () => {
  beforeAll(() => {
    Object.defineProperties(window, {
      innerWidth: {
        value: 1000,
        writable: true,
        configurable: true,
      },
      innerHeight: {
        value: 800,
        writable: true,
        configurable: true,
      },
    });
  });

  it('should render highlight box with correct position and size', () => {
    renderWithI18n(
      <InspectHighlight
        currentPosition={{
          top: 10,
          left: 20,
          width: 100,
          height: 50,
          transform: 'translate(20px,10px)',
        }}
        path={null}
      />
    );

    const highlight = screen.getByTestId('inspectHighlightBox');
    expect(highlight).toBeInTheDocument();
    expect(highlight).toHaveStyle({
      width: '100px',
      height: '50px',
      position: 'absolute',
    });
  });

  it('should render badge when path is provided', () => {
    renderWithI18n(
      <InspectHighlight
        currentPosition={{
          top: 0,
          left: 0,
          width: 50,
          height: 20,
          transform: 'translate(0px,0px)',
        }}
        path="CapybaraWrapper"
      />
    );

    const badge = screen.getByText('CapybaraWrapper');

    expect(badge).toBeInTheDocument();
  });

  it('should adjust badge position if it would overflow the right of the viewport', () => {
    const badgeRect = { width: 200, height: 20, top: 0, left: 0, bottom: 0, right: 0 } as DOMRect;
    const containerRect = {
      top: 0,
      left: 900,
      width: 100,
      height: 50,
    } as DOMRect;

    renderWithI18n(
      <InspectHighlight
        currentPosition={{
          top: 0,
          left: 900,
          width: 100,
          height: 50,
          transform: 'translate(900px,0px)',
        }}
        path="CapybaraWrapper"
      />
    );

    const container = screen.getByTestId('inspectHighlightContainer');
    const badge = screen.getByTestId('inspectHighlightBadge');

    badge.getBoundingClientRect = jest.fn(() => badgeRect);
    container.getBoundingClientRect = jest.fn(() => containerRect);

    expect(badge.style.left).toBeDefined();
  });

  it('should flip badge above if it would overflow the bottom of the viewport', () => {
    const badgeRect = { width: 50, height: 50, top: 0, left: 0, bottom: 0, right: 0 } as DOMRect;
    const containerRect = {
      top: 780,
      left: 0,
      width: 100,
      height: 50,
    } as DOMRect;

    renderWithI18n(
      <InspectHighlight
        currentPosition={{
          top: 780,
          left: 0,
          width: 100,
          height: 50,
          transform: 'translate(0px,780px)',
        }}
        path="CapybaraWrapper"
      />
    );

    const container = screen.getByTestId('inspectHighlightContainer');
    const badge = screen.getByTestId('inspectHighlightBadge');

    badge.getBoundingClientRect = jest.fn(() => badgeRect);
    container.getBoundingClientRect = jest.fn(() => containerRect);

    expect(badge.style.top).toBeDefined();
  });
});
