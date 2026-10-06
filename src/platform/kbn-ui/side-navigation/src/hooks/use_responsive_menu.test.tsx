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

import { PRIMARY_MENU_ITEMS } from '../mocks/basic_navigation';
import { countVisibleMenuItems } from '../utils/count_visible_menu_items';
import { useResponsiveMenu } from './use_responsive_menu';

// jsdom has no layout, so the fitting math comes from here.
jest.mock('../utils/count_visible_menu_items', () => ({
  countVisibleMenuItems: jest.fn(),
}));

jest.mock('../utils/get_style_property', () => ({
  getStyleProperty: jest.fn(() => 0),
}));

const countVisibleMenuItemsMock = jest.mocked(countVisibleMenuItems);

const TestMenu = () => {
  const { primaryMenuRef, isOverflowMeasured, overflowMenuItems, visibleMenuItems } =
    useResponsiveMenu(false, PRIMARY_MENU_ITEMS);

  return (
    <div
      ref={(element) => {
        primaryMenuRef.current = element;
      }}
      data-test-subj="primaryMenu"
      data-overflow-measured={isOverflowMeasured}
      data-overflow-items={overflowMenuItems.length}
    >
      {visibleMenuItems.map(({ id, label }) => (
        <span key={id}>{label}</span>
      ))}
    </div>
  );
};

describe('useResponsiveMenu', () => {
  const originalResizeObserver = global.ResizeObserver;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;

  let resizeCallback: ResizeObserverCallback | undefined;
  let frameCallbacks: Map<number, FrameRequestCallback>;

  const menu = () => screen.getByTestId('primaryMenu');

  const flushFrames = () =>
    act(() => {
      frameCallbacks.forEach((callback, id) => {
        frameCallbacks.delete(id);
        callback(performance.now());
      });
    });

  const resizeMenu = () => act(() => resizeCallback?.([], {} as ResizeObserver));

  beforeEach(() => {
    let frameId = 0;
    resizeCallback = undefined;
    frameCallbacks = new Map();

    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      frameId += 1;
      frameCallbacks.set(frameId, callback);
      return frameId;
    };

    window.cancelAnimationFrame = (id: number) => {
      frameCallbacks.delete(id);
    };

    global.ResizeObserver = jest.fn((callback: ResizeObserverCallback) => {
      resizeCallback = callback;
      return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      };
    });

    countVisibleMenuItemsMock.mockReturnValue(PRIMARY_MENU_ITEMS.length);
  });

  afterEach(() => {
    global.ResizeObserver = originalResizeObserver;
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    jest.clearAllMocks();
  });

  /**
   * GIVEN the menu publishes an item set with every item in the primary menu
   * WHEN the scheduled measurement has not run yet
   * THEN the overflow split is not reported as measured
   */
  it('reports the overflow split as measured once the scheduled measurement runs', () => {
    render(<TestMenu />);

    expect(menu()).toHaveAttribute('data-overflow-measured', 'false');

    flushFrames();

    expect(menu()).toHaveAttribute('data-overflow-measured', 'true');
  });

  /**
   * GIVEN the overflow split has been measured
   * WHEN a resize schedules a re-measurement that moves an item into "More"
   * THEN the split stops being reported as measured until that measurement runs
   */
  it('stops reporting the overflow split as measured while a resize re-measurement is pending', () => {
    render(<TestMenu />);
    flushFrames();

    expect(menu()).toHaveAttribute('data-overflow-items', '0');

    countVisibleMenuItemsMock.mockReturnValue(PRIMARY_MENU_ITEMS.length - 1);
    resizeMenu();

    expect(menu()).toHaveAttribute('data-overflow-measured', 'false');

    flushFrames();

    expect(menu()).toHaveAttribute('data-overflow-measured', 'true');
    expect(menu()).toHaveAttribute('data-overflow-items', '1');
  });
});
