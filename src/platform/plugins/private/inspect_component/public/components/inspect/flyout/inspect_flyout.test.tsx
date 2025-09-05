/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { InspectFlyout } from './inspect_flyout';
import { mockBranch, mockComponentData } from '../../../__mocks__/mocks';

describe('InspectFlyout', () => {
  let target: HTMLElement;

  beforeEach(() => {
    target = document.createElement('div');
    Object.defineProperty(target, 'getBoundingClientRect', {
      value: jest.fn(() => ({
        top: 10,
        left: 20,
        width: 100,
        height: 50,
      })),
    });
  });

  it('should render correctly', () => {
    renderWithI18n(
      <InspectFlyout componentData={mockComponentData} target={target} branch={mockBranch} />
    );

    expect(screen.getByTestId('inspectFlyoutHeader')).toBeInTheDocument();
  });

  it('should set initial highlight position based on target', () => {
    renderWithI18n(
      <InspectFlyout componentData={mockComponentData} target={target} branch={mockBranch} />
    );

    // For fixed positioning, check the container element that has the actual positioning
    const container = screen.getByTestId('inspectHighlightContainer');
    expect(container).toBeInTheDocument();

    const containerStyle = window.getComputedStyle(container);
    expect(containerStyle.top).toBe('10px');
    expect(containerStyle.left).toBe('20px');
    expect(containerStyle.width).toBe('100px');
    expect(containerStyle.height).toBe('50px');
    expect(containerStyle.position).toBe('fixed');

    // The highlight box should fill the container
    const highlight = screen.getByTestId('inspectHighlightBox');
    const highlightStyle = window.getComputedStyle(highlight);
    expect(highlightStyle.top).toBe('0px');
    expect(highlightStyle.left).toBe('0px');
  });

  it('should update highlight position on window resize', async () => {
    renderWithI18n(
      <InspectFlyout componentData={mockComponentData} target={target} branch={mockBranch} />
    );

    // Verify initial position
    const container = screen.getByTestId('inspectHighlightContainer');
    let containerStyle = window.getComputedStyle(container);
    expect(containerStyle.top).toBe('10px');
    expect(containerStyle.left).toBe('20px');
    expect(containerStyle.width).toBe('100px');
    expect(containerStyle.height).toBe('50px');

    const newRect = {
      top: 50,
      left: 60,
      width: 200,
      height: 100,
    };
    (target.getBoundingClientRect as jest.Mock).mockReturnValue(newRect);

    fireEvent(window, new Event('resize'));

    // For fixed positioning, check the container element that has the actual positioning
    const updatedContainer = await screen.findByTestId('inspectHighlightContainer');
    containerStyle = window.getComputedStyle(updatedContainer);
    expect(containerStyle.top).toBe('50px');
    expect(containerStyle.left).toBe('60px');
    expect(containerStyle.width).toBe('200px');
    expect(containerStyle.height).toBe('100px');
    expect(containerStyle.position).toBe('fixed');

    // The highlight box should still fill the container
    const highlight = screen.getByTestId('inspectHighlightBox');
    const highlightStyle = window.getComputedStyle(highlight);
    expect(highlightStyle.top).toBe('0px');
    expect(highlightStyle.left).toBe('0px');
  });
});
