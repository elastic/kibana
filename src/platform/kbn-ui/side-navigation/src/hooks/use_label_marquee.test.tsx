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

import { useLabelMarquee } from './use_label_marquee';

const GUTTER = 8;

const Label = () => {
  const { isOverflowing, labelProps, trackProps } = useLabelMarquee({
    gutter: `${GUTTER}px`,
    isLabelFirst: true,
    isLabelLast: true,
  });

  return (
    <span data-test-subj="label" data-overflowing={isOverflowing} {...labelProps}>
      <span data-test-subj="track" {...trackProps}>
        A long label
      </span>
    </span>
  );
};

describe('useLabelMarquee', () => {
  // jsdom has no layout, so element sizes come from here.
  const widths = { label: 0, track: 0 };
  let resizeCallback: ResizeObserverCallback | undefined;
  const observed: Element[] = [];
  const originalResizeObserver = global.ResizeObserver;
  const originalGetComputedStyle = window.getComputedStyle;

  const getWidth = (element: Element) =>
    widths[element.getAttribute('data-test-subj') as keyof typeof widths] ?? 0;

  const getOverflowWidth = () =>
    screen.getByTestId('label').style.getPropertyValue('--label-overflow-width');

  beforeEach(() => {
    widths.label = 100;
    widths.track = 50;
    resizeCallback = undefined;
    observed.length = 0;

    global.ResizeObserver = jest.fn((callback: ResizeObserverCallback) => {
      resizeCallback = callback;
      return {
        observe: (element: Element) => observed.push(element),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      };
    });

    jest
      .spyOn(Element.prototype, 'clientWidth', 'get')
      .mockImplementation(function (this: Element) {
        return getWidth(this);
      });
    jest
      .spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
      .mockImplementation(function (this: HTMLElement) {
        return getWidth(this);
      });

    // The label always reports the gutter padding so the content-box math is exercised.
    jest
      .spyOn(window, 'getComputedStyle')
      .mockImplementation((element, pseudo) =>
        element.getAttribute('data-test-subj') === 'label'
          ? ({ paddingLeft: `${GUTTER}px`, paddingRight: `${GUTTER}px` } as CSSStyleDeclaration)
          : originalGetComputedStyle(element, pseudo)
      );
  });

  afterEach(() => {
    global.ResizeObserver = originalResizeObserver;
    jest.restoreAllMocks();
  });

  it('does not overflow when the text fits the label content box', () => {
    widths.track = 100 - GUTTER * 2;

    render(<Label />);

    expect(screen.getByTestId('label')).toHaveAttribute('data-overflowing', 'false');
    expect(getOverflowWidth()).toBe('');
  });

  it('sets the hidden width, excluding the gutter padding, when the text overflows', () => {
    widths.track = 150;

    render(<Label />);

    expect(screen.getByTestId('label')).toHaveAttribute('data-overflowing', 'true');
    expect(getOverflowWidth()).toBe(String(150 - (100 - GUTTER * 2)));
  });

  it('re-measures when the text changes size without the label resizing', () => {
    widths.track = 150;
    render(<Label />);

    expect(observed).toContain(screen.getByTestId('track'));

    widths.track = 60;
    act(() => resizeCallback?.([], {} as ResizeObserver));

    expect(screen.getByTestId('label')).toHaveAttribute('data-overflowing', 'false');
    expect(getOverflowWidth()).toBe('');
  });
});
