/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { FontInspectOverlay } from './font_inspect_overlay';

describe('FontInspectOverlay', () => {
  let setIsInspectingFont: jest.Mock;
  let originalElementsFromPoint: typeof document.elementsFromPoint;
  let elementA: HTMLDivElement;
  let elementB: HTMLDivElement;

  const computedStylesByElement = new Map<Element, Partial<CSSStyleDeclaration>>();
  const originalGetComputedStyle = window.getComputedStyle;

  beforeEach(() => {
    setIsInspectingFont = jest.fn();
    originalElementsFromPoint = document.elementsFromPoint;

    elementA = document.createElement('div');
    elementB = document.createElement('div');
    document.body.appendChild(elementA);
    document.body.appendChild(elementB);

    computedStylesByElement.set(elementA, {
      fontFamily: '"Inter", sans-serif',
      fontSize: '16px',
      fontWeight: '400',
      lineHeight: '24px',
      letterSpacing: 'normal',
      color: 'rgb(29, 42, 62)',
      backgroundColor: 'rgba(0, 0, 0, 0)',
      borderTopWidth: '0px',
      borderTopColor: 'rgb(29, 42, 62)',
      borderTopLeftRadius: '0px',
      width: '100px',
      height: '20px',
    });
    computedStylesByElement.set(elementB, {
      fontFamily: '"Roboto", sans-serif',
      fontSize: '14px',
      fontWeight: '400',
      lineHeight: '20px',
      letterSpacing: 'normal',
      color: 'rgb(29, 42, 62)',
      backgroundColor: 'rgba(0, 0, 0, 0)',
      borderTopWidth: '0px',
      borderTopColor: 'rgb(29, 42, 62)',
      borderTopLeftRadius: '0px',
      width: '16px',
      height: '16px',
    });

    jest.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudoElt) => {
      const override = computedStylesByElement.get(el);
      return override ? (override as CSSStyleDeclaration) : originalGetComputedStyle(el, pseudoElt);
    });

    // handlePointerMove throttles via requestAnimationFrame; run it
    // synchronously so pointermove assertions don't need to wait a frame.
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

  it('pins an element on click', () => {
    renderWithI18n(<FontInspectOverlay setIsInspectingFont={setIsInspectingFont} />);

    mockHitTarget(elementA);
    fireEvent.click(elementA);

    expect(screen.getByTestId('fontInfoCard')).toBeInTheDocument();
    expect(screen.getByTestId('fontInfoCardClose')).toBeInTheDocument();
    expect(screen.getByText('"Inter", sans-serif')).toBeInTheDocument();
  });

  it('pins an element on click via document capture handler', () => {
    renderWithI18n(<FontInspectOverlay setIsInspectingFont={setIsInspectingFont} />);

    mockHitTarget(elementA);
    fireEvent.click(document.body);

    expect(screen.getByTestId('fontInfoCard')).toBeInTheDocument();
  });

  it('allows multiple elements to be pinned at the same time', () => {
    renderWithI18n(<FontInspectOverlay setIsInspectingFont={setIsInspectingFont} />);

    mockHitTarget(elementA);
    fireEvent.click(elementA);

    mockHitTarget(elementB);
    fireEvent.click(elementB);

    expect(screen.getAllByTestId('fontInfoCard')).toHaveLength(2);
    expect(screen.getByText('"Inter", sans-serif')).toBeInTheDocument();
    expect(screen.getByText('"Roboto", sans-serif')).toBeInTheDocument();
  });

  it('unpins just the clicked element when it is already pinned, leaving other pins intact', () => {
    renderWithI18n(<FontInspectOverlay setIsInspectingFont={setIsInspectingFont} />);

    mockHitTarget(elementA);
    fireEvent.click(elementA);
    mockHitTarget(elementB);
    fireEvent.click(elementB);

    expect(screen.getAllByTestId('fontInfoCard')).toHaveLength(2);

    // Click elementA again to unpin it.
    mockHitTarget(elementA);
    fireEvent.click(elementA);

    expect(screen.getAllByTestId('fontInfoCard')).toHaveLength(1);
    expect(screen.queryByText('"Inter", sans-serif')).not.toBeInTheDocument();
    expect(screen.getByText('"Roboto", sans-serif')).toBeInTheDocument();
  });

  it('removes only the pinned card whose close button was clicked', () => {
    renderWithI18n(<FontInspectOverlay setIsInspectingFont={setIsInspectingFont} />);

    mockHitTarget(elementA);
    fireEvent.click(elementA);
    mockHitTarget(elementB);
    fireEvent.click(elementB);

    const cards = screen.getAllByTestId('fontInfoCard');
    const cardWithInter = cards.find((card) => within(card).queryByText('"Inter", sans-serif'));
    expect(cardWithInter).toBeDefined();

    fireEvent.click(within(cardWithInter!).getByTestId('fontInfoCardClose'));

    expect(screen.getAllByTestId('fontInfoCard')).toHaveLength(1);
    expect(screen.queryByText('"Inter", sans-serif')).not.toBeInTheDocument();
    expect(screen.getByText('"Roboto", sans-serif')).toBeInTheDocument();
  });

  it('updates the hover preview even when the pointermove target is not the backdrop', () => {
    // The listener must be attached on `document` (capture phase), not via
    // the backdrop's `onPointerMove`: UI chrome (pinned cards, etc.) renders
    // as a *sibling* of the backdrop, so events dispatched on it would never
    // bubble/capture through the backdrop element itself.
    renderWithI18n(<FontInspectOverlay setIsInspectingFont={setIsInspectingFont} />);

    const unrelatedNode = document.createElement('span');
    document.body.appendChild(unrelatedNode);

    mockHitTarget(elementB);
    fireEvent.pointerMove(unrelatedNode, { clientX: 5, clientY: 5 });

    expect(screen.getByText('"Roboto", sans-serif')).toBeInTheDocument();

    unrelatedNode.remove();
  });

  it('clears the stale hover preview when the pointer moves onto a pinned panel', () => {
    renderWithI18n(<FontInspectOverlay setIsInspectingFont={setIsInspectingFont} />);

    // Pin elementA, then hover elementB elsewhere in the UI.
    mockHitTarget(elementA);
    fireEvent.click(elementA);

    mockHitTarget(elementB);
    fireEvent.pointerMove(elementB, { clientX: 1, clientY: 1 });
    expect(screen.getByText('"Roboto", sans-serif')).toBeInTheDocument();

    // Move the pointer onto the now-rendered pinned panel itself (not the
    // backdrop). Before the fix this pointermove was never observed, so the
    // stale "Roboto" hover preview from elementB kept showing indefinitely.
    // (Both the pinned card for elementA and the hover card for elementB
    // share the "fontInfoCard" test id - the pinned one is the one with a
    // close button.)
    document.elementsFromPoint = jest.fn().mockReturnValue([]);
    const pinnedCard = screen
      .getAllByTestId('fontInfoCard')
      .find((card) => within(card).queryByTestId('fontInfoCardClose'));
    expect(pinnedCard).toBeDefined();
    fireEvent.pointerMove(pinnedCard!, { clientX: 1, clientY: 1 });

    expect(screen.queryByText('"Roboto", sans-serif')).not.toBeInTheDocument();
  });

  it('does not show a bogus hover preview for whatever element sits underneath a pinned panel', () => {
    // Reproduces a reported bug: pin an element, then move the pointer over
    // the pinned card itself. getElementFromPoint's pass-through (meant for
    // seeing through the backdrop) would otherwise walk past the card's own
    // ignored DOM and resolve to whatever real page element happens to be
    // positioned underneath the card on screen - showing a second, bogus
    // hover card for that unrelated element.
    renderWithI18n(<FontInspectOverlay setIsInspectingFont={setIsInspectingFont} />);

    mockHitTarget(elementA);
    fireEvent.click(elementA);

    const pinnedCard = screen.getByTestId('fontInfoCard');
    const cardInnerNode = within(pinnedCard).getByText('"Inter", sans-serif');

    // Simulate real browser stacking: elementsFromPoint returns the card's
    // own elements first (topmost), followed by an unrelated real page
    // element ("elementB") that happens to sit underneath it.
    document.elementsFromPoint = jest.fn().mockReturnValue([cardInnerNode, elementB]);
    fireEvent.pointerMove(cardInnerNode, { clientX: 1, clientY: 1 });

    expect(screen.queryByText('"Roboto", sans-serif')).not.toBeInTheDocument();
  });

  it('closes the overlay on Escape', () => {
    renderWithI18n(<FontInspectOverlay setIsInspectingFont={setIsInspectingFont} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(setIsInspectingFont).toHaveBeenCalledWith(false);
  });
});
