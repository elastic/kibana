/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AT_TOOLTIP_ATTR, IGNORE_ATTR } from '../constants';
import { mockLayout, query, renderPage } from '../test_helpers';
import {
  BOUNDARY_EVENTS,
  FOCUS_EVENTS,
  MOVE_EVENTS,
  createTooltipHold,
  type TooltipHold,
} from './tooltip_hold';

describe('createTooltipHold', () => {
  mockLayout();

  let hold: TooltipHold;
  let ignoreSelectors: string[] = [];
  let held = false;
  // As the overlay does: the events come to the hold in the capture phase, ahead of the page.
  const onBoundary = (event: Event) => {
    held = hold.hold(event as MouseEvent, ignoreSelectors);
  };
  const onMove = (event: Event) => {
    held = hold.move(event as MouseEvent, ignoreSelectors);
  };
  const onFocus = (event: Event) => {
    held = hold.focus(event as FocusEvent, ignoreSelectors);
  };

  /** Dispatches the event on `target`, the pointer at the point going to `to`; whether the hold kept it from the page. */
  const boundary = (
    type: string,
    target: Element,
    x: number,
    y: number,
    to: Element | null = document.body
  ): boolean => {
    target.dispatchEvent(
      new MouseEvent(type, {
        bubbles: type.endsWith('over') || type.endsWith('out'),
        clientX: x,
        clientY: y,
        relatedTarget: to,
      })
    );
    return held;
  };

  /** The pointer leaving `target` at the point; whether the leave was held back. */
  const leaveAt = (target: Element, x: number, y: number, ignore: string[] = []): boolean => {
    ignoreSelectors = ignore;
    return boundary('mouseout', target, x, y);
  };

  /** The pointer moving to the point, over `target`; whether the move was held back. */
  const move = (x: number, y: number, target: Element = document.body): boolean => {
    target.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y }));
    return held;
  };

  /** Focus leaving or reaching `target`, from or for `to`; whether the event was held back. */
  const focusEvent = (type: string, target: Element, to: Element | null): boolean => {
    target.dispatchEvent(
      new FocusEvent(type, {
        bubbles: type.endsWith('in') || type.endsWith('out'),
        relatedTarget: to,
      })
    );
    return held;
  };

  const attachThread = () => {
    const thread = document.createElement('div');
    thread.setAttribute(AT_TOOLTIP_ATTR, 'true');
    thread.setAttribute(IGNORE_ATTR, 'true');
    thread.setAttribute('data-rect', '160,90,300,200');
    thread.innerHTML = `<textarea id="reply"></textarea><button id="post">Post</button>`;
    document.body.append(thread);
    return thread;
  };

  beforeEach(() => {
    hold = createTooltipHold();
    ignoreSelectors = [];
    BOUNDARY_EVENTS.forEach((type) => document.addEventListener(type, onBoundary, true));
    MOVE_EVENTS.forEach((type) => document.addEventListener(type, onMove, true));
    FOCUS_EVENTS.forEach((type) => document.addEventListener(type, onFocus, true));
    // The tooltip is 20px below the button, narrower than it, over another button; a third button sits right of it, a fourth far below.
    renderPage(`
      <button id="save" aria-describedby="tip" data-rect="0,0,200,30"><span id="saveText" data-rect="10,5,80,20">Save</span></button>
      <button id="far" aria-describedby="hostTip" data-rect="0,300,100,30">Far</button>
      <div id="host"><div id="hostTip" role="tooltip" data-rect="0,300,120,40">Of the host</div></div>
      <div id="tip" role="tooltip" data-rect="40,50,120,40">Saves the rule</div>
      <button id="under" data-rect="60,55,40,20">Under</button>
      <button id="side" data-rect="170,50,60,40">Side</button>
      <button id="below" data-rect="200,300,100,30">Below</button>
    `);
  });

  afterEach(() => {
    BOUNDARY_EVENTS.forEach((type) => document.removeEventListener(type, onBoundary, true));
    MOVE_EVENTS.forEach((type) => document.removeEventListener(type, onMove, true));
    FOCUS_EVENTS.forEach((type) => document.removeEventListener(type, onFocus, true));
  });

  it('holds the leaves of the element only when the pointer goes out of the side facing the tooltip, anywhere along it', () => {
    const left = jest.fn();
    query('#save').addEventListener('mouseout', left);

    // Up, and out of the left side: the page's.
    expect(leaveAt(query('#save'), 100, -5)).toBe(false);
    expect(leaveAt(query('#save'), -5, 10)).toBe(false);
    // Within the button still (out of its text), not near its bottom: the page's too.
    expect(leaveAt(query('#saveText'), 50, 10)).toBe(false);
    expect(left).toHaveBeenCalledTimes(3);
    expect(hold.trigger()).toBeNull();

    // Down, past the tooltip's side: the pointer may well be heading for it diagonally.
    expect(leaveAt(query('#save'), 190, 35)).toBe(true);
    expect(hold.trigger()).toBe(query('#save'));
    expect(left).toHaveBeenCalledTimes(3);
  });

  it("holds while the pointer nears the tooltip, is on it or on the layer's UI at it, or is back on the element; lets the leaves go once as it turns away, or the tooltip is gone", () => {
    const left = jest.fn((event: MouseEvent) => [event.target, event.relatedTarget]);
    query('#save').addEventListener('mouseout', left);
    attachThread();

    // Diagonally in from the button's corner.
    leaveAt(query('#save'), 190, 35);
    move(170, 48);
    move(100, 70);
    move(400, 250);
    // Back over the button, and on to the tooltip once more.
    move(100, 20);
    move(100, 60);
    expect(left).not.toHaveBeenCalled();

    move(300, 320);
    expect(left.mock.results.map(({ value }) => value)).toEqual([[query('#save'), null]]);
    expect(hold.trigger()).toBeNull();
    hold.release();
    expect(left).toHaveBeenCalledTimes(1);

    leaveAt(query('#save'), 100, 35);
    query('#tip').remove();
    move(100, 35);
    expect(left).toHaveBeenCalledTimes(2);
  });

  it("tells the page nothing of the pointer while holding: not of what is under the tooltip being entered or moved over, nor of the layer's UI at it", () => {
    const thread = attachThread();
    const page = jest.fn();
    document.body.addEventListener('mouseover', page);
    document.body.addEventListener('mouseout', page);
    const under = jest.fn();
    query('#under').addEventListener('mouseenter', under);

    leaveAt(query('#save'), 100, 35);
    // Onto the button under the tooltip, then onto the thread, and within it.
    expect(boundary('mouseover', query('#under'), 100, 60, query('#save'))).toBe(true);
    expect(move(100, 60, query('#under'))).toBe(true);
    expect(boundary('mouseout', query('#under'), 200, 100, thread)).toBe(true);
    expect(boundary('mouseover', thread, 200, 100, query('#under'))).toBe(true);
    expect(boundary('mouseout', thread, 300, 150, thread)).toBe(true);
    expect(page).not.toHaveBeenCalled();
    // What the elements are told themselves is theirs still; so are the layer's moves, and the element's own.
    expect(boundary('mouseenter', query('#under'), 100, 60, query('#save'))).toBe(false);
    expect(under).toHaveBeenCalledTimes(1);
    expect(move(300, 150, thread)).toBe(false);
    expect(move(100, 20, query('#saveText'))).toBe(false);

    // Away: the page hears of the pointer again.
    expect(move(60, 320, query('#far'))).toBe(false);
    expect(boundary('mouseover', query('#far'), 60, 320, thread)).toBe(false);
    expect(page).toHaveBeenCalledTimes(2);
  });

  it("holds from an element the pointer leaves for a tooltip showing, or for the layer's UI at it, and lets go to the element then under the pointer", () => {
    const leftSide = jest.fn((event: MouseEvent) => [event.target, event.relatedTarget]);
    query('#side').addEventListener('mouseout', leftSide);
    const leftBelow = jest.fn();
    query('#below').addEventListener('mouseout', leftBelow);
    attachThread();

    // The tooltip is 10px off the side button, which does not show it.
    expect(boundary('mouseout', query('#side'), 165, 70, query('#under'))).toBe(true);
    expect(hold.trigger()).toBe(query('#save'));
    move(100, 70);
    expect(leftSide).not.toHaveBeenCalled();

    // Up onto the button that shows it: that is where the side button's leave went.
    move(100, 20, query('#save'));
    expect(leftSide.mock.results.map(({ value }) => value)).toEqual([
      [query('#side'), query('#save')],
    ]);
    expect(hold.trigger()).toBeNull();

    // Up from the button far below the tooltip, onto the thread at it.
    expect(boundary('mouseout', query('#below'), 250, 295, query('#reply'))).toBe(true);
    expect(hold.trigger()).toBe(query('#save'));
    expect(leftBelow).not.toHaveBeenCalled();
  });

  it('lets the leaves go as the pointer gets farther from the tooltip than an unsteady hand strays', () => {
    const left = jest.fn();
    query('#save').addEventListener('mouseout', left);

    leaveAt(query('#save'), 100, 35);
    move(100, 40);
    // Off to the side a little, then off for good.
    move(30, 40);
    expect(left).not.toHaveBeenCalled();
    move(10, 40);
    expect(left).toHaveBeenCalledTimes(1);
    expect(hold.trigger()).toBeNull();

    // Back on the button afterwards, its own leave is the page's again.
    expect(leaveAt(query('#save'), 100, -5)).toBe(false);
    expect(left).toHaveBeenCalledTimes(2);
  });

  it('does not hold for a tooltip far from the element, or one of UI left out; gives up the hold to a leave from elsewhere, which goes through', () => {
    const leftFar = jest.fn();
    query('#far').addEventListener('mouseout', leftFar);

    // The host's tooltip is over the button, but not the page's; the page's is far.
    expect(leaveAt(query('#far'), 50, 335, ['#host'])).toBe(false);
    expect(leaveAt(query('#far'), 50, 335)).toBe(true);
    hold.release();
    expect(leftFar).toHaveBeenCalledTimes(2);

    leaveAt(query('#save'), 100, 35);
    expect(leaveAt(query('#far'), 50, 290, ['#host'])).toBe(false);
    expect(leftFar).toHaveBeenCalledTimes(3);
    expect(hold.trigger()).toBeNull();
  });

  it("holds the blur of the element showing the tooltip while focus is in the layer's UI at it, and lets it go once focus lands on the page elsewhere", () => {
    attachThread();
    const blurred = jest.fn((event: FocusEvent) => [event.type, event.relatedTarget]);
    query('#save').addEventListener('blur', blurred);
    query('#save').addEventListener('focusout', blurred);
    const farBlurred = jest.fn();
    query('#far').addEventListener('blur', farBlurred);

    // Into the composer: the page is told nothing, and knows the element to show the tooltip.
    expect(focusEvent('blur', query('#save'), query('#reply'))).toBe(true);
    expect(focusEvent('focusout', query('#save'), query('#reply'))).toBe(true);
    expect(blurred).not.toHaveBeenCalled();
    expect(hold.trigger()).toBe(query('#save'));
    // Around the layer's UI: nothing to the page either way.
    expect(focusEvent('focusin', query('#reply'), query('#save'))).toBe(false);
    expect(focusEvent('focusout', query('#reply'), query('#post'))).toBe(false);
    expect(focusEvent('focusin', query('#post'), query('#reply'))).toBe(false);
    expect(blurred).not.toHaveBeenCalled();

    // Back on the element: the page was right all along.
    expect(focusEvent('focusin', query('#save'), query('#post'))).toBe(false);
    expect(blurred).not.toHaveBeenCalled();
    expect(hold.trigger()).toBeNull();

    // Away to another element of the page: the element learns of the blur, to that element.
    focusEvent('blur', query('#save'), query('#reply'));
    focusEvent('focusout', query('#save'), query('#reply'));
    expect(focusEvent('focusin', query('#far'), query('#reply'))).toBe(false);
    expect(blurred.mock.results.map(({ value }) => value)).toEqual([
      ['blur', query('#far')],
      ['focusout', query('#far')],
    ]);

    // An element showing no tooltip, or losing focus to the page, is the page's.
    ignoreSelectors = ['#host'];
    expect(focusEvent('blur', query('#far'), query('#reply'))).toBe(false);
    ignoreSelectors = [];
    expect(focusEvent('blur', query('#save'), query('#far'))).toBe(false);
    expect(farBlurred).toHaveBeenCalledTimes(1);
    expect(blurred).toHaveBeenCalledTimes(3);
  });

  it('ends the holds, the page learning of the pointer and of focus as they are', () => {
    attachThread();
    const left = jest.fn((event: MouseEvent) => event.relatedTarget);
    query('#save').addEventListener('mouseout', left);
    const blurred = jest.fn((event: FocusEvent) => event.relatedTarget);
    query('#save').addEventListener('focusout', blurred);

    leaveAt(query('#save'), 100, 35);
    focusEvent('focusout', query('#save'), query('#reply'));
    (query('#reply') as HTMLTextAreaElement).focus();
    hold.end();
    expect(left.mock.results.map(({ value }) => value)).toEqual([null]);
    expect(blurred.mock.results.map(({ value }) => value)).toEqual([query('#reply')]);
    expect(hold.trigger()).toBeNull();

    // Focus back on the element by then: nothing for the page to learn.
    focusEvent('focusout', query('#save'), query('#reply'));
    (query('#save') as HTMLButtonElement).focus();
    hold.end();
    expect(blurred).toHaveBeenCalledTimes(1);
  });
});
