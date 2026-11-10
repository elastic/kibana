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
import { MeasureOverlay } from './measure_overlay';

describe('MeasureOverlay', () => {
  let setIsMeasuring: jest.Mock;
  let originalElementsFromPoint: typeof document.elementsFromPoint;
  let elementA: HTMLDivElement;
  let elementB: HTMLDivElement;

  beforeEach(() => {
    setIsMeasuring = jest.fn();
    originalElementsFromPoint = document.elementsFromPoint;

    elementA = document.createElement('div');
    elementB = document.createElement('div');
    document.body.appendChild(elementA);
    document.body.appendChild(elementB);

    jest.spyOn(elementA, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      top: 0,
      left: 0,
      bottom: 50,
      right: 100,
      toJSON: () => ({}),
    });
    jest.spyOn(elementB, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 100,
      width: 80,
      height: 40,
      top: 100,
      left: 0,
      bottom: 140,
      right: 80,
      toJSON: () => ({}),
    });

    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    document.elementsFromPoint = originalElementsFromPoint;
    elementA.remove();
    elementB.remove();
    jest.restoreAllMocks();
  });

  const mockHitTarget = (target: Element) => {
    document.elementsFromPoint = jest.fn().mockReturnValue([target]);
  };

  it('sets an anchor element on click', () => {
    renderWithI18n(<MeasureOverlay setIsMeasuring={setIsMeasuring} />);

    mockHitTarget(elementA);
    fireEvent.click(elementA);

    expect(screen.getByTestId('measureAnchorHighlight')).toBeInTheDocument();
    expect(screen.getByText('100 x 50')).toBeInTheDocument();
  });

  it('sets an anchor when click resolves a page element via capture handler', () => {
    renderWithI18n(<MeasureOverlay setIsMeasuring={setIsMeasuring} />);

    mockHitTarget(elementA);
    fireEvent.click(document.body);

    expect(screen.getByTestId('measureAnchorHighlight')).toBeInTheDocument();
  });

  it('updates hover highlight and spacing while an anchor is set even when pointermove target is not the backdrop', () => {
    renderWithI18n(<MeasureOverlay setIsMeasuring={setIsMeasuring} />);

    mockHitTarget(elementA);
    fireEvent.click(elementA);

    const unrelatedNode = document.createElement('span');
    document.body.appendChild(unrelatedNode);

    mockHitTarget(elementB);
    fireEvent.pointerMove(unrelatedNode, { clientX: 5, clientY: 105 });

    expect(screen.getByTestId('measureHoverHighlight')).toBeInTheDocument();
    expect(screen.getAllByTestId('spacingMeasurementLine').length).toBeGreaterThan(0);

    unrelatedNode.remove();
  });

  it('closes the overlay on Escape', () => {
    renderWithI18n(<MeasureOverlay setIsMeasuring={setIsMeasuring} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(setIsMeasuring).toHaveBeenCalledWith(false);
  });
});
