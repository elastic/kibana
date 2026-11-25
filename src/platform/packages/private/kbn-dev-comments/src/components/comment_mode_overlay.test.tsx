/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { AT_TOOLTIP_ATTR, IGNORE_ATTR } from '../constants';
import { createCommentsController } from '../state/comments_controller';
import { createHostServices, flush, mockLayout, query, renderPage } from '../test_helpers';
import { CommentsProvider } from './comments_context';
import { CommentModeOverlay } from './comment_mode_overlay';

const keyDown = (element: Element, init: KeyboardEventInit) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  element.dispatchEvent(event);
  return event;
};

const release = (element: Element, init: MouseEventInit = {}) =>
  element.dispatchEvent(
    new MouseEvent('pointerup', {
      bubbles: true,
      cancelable: true,
      clientX: 5,
      clientY: 6,
      ...init,
    })
  );

describe('CommentModeOverlay', () => {
  mockLayout();

  beforeEach(() => {
    renderPage(`
      <button id="target">Target</button>
      <input id="field" value="before" />
      <input id="check" type="checkbox" /><label id="checkLabel" for="check">Check</label>
      <div id="host"><button id="hostButton">Host</button></div>
      <div ${IGNORE_ATTR}="true"><textarea id="composer"></textarea></div>
      <button id="save" aria-describedby="tip" data-rect="200,150,100,30"><span id="saveText" data-rect="220,155,60,20">Save</span></button>
      <div id="tip" role="tooltip" data-rect="200,200,100,40">Saves the rule</div>
    `);
  });

  const renderOverlay = () => {
    const controller = createCommentsController(createHostServices({ ignoreSelectors: ['#host'] }));
    controller.pick = jest.fn();
    render(
      <CommentsProvider controller={controller}>
        <CommentModeOverlay />
      </CommentsProvider>
    );
    return controller;
  };

  it('starts a comment where the pointer is released, on disabled controls too, but not on clicks the page synthesizes', () => {
    const controller = renderOverlay();
    const target = query<HTMLButtonElement>('#target');
    const pageHandler = jest.fn();
    target.addEventListener('click', pageHandler);
    // Browsers dispatch the pointer's release on a disabled control, but never a click.
    target.disabled = true;

    const mouse = (type: string, init: MouseEventInit = {}) =>
      target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...init }));
    mouse('pointerdown');
    mouse('pointerup', { clientX: 5, clientY: 6 });
    mouse('pointerup', { button: 2 });
    mouse('click', { detail: 1 });
    mouse('click', { detail: 0 });

    expect(pageHandler).not.toHaveBeenCalled();
    expect(controller.pick).toHaveBeenCalledTimes(1);
    expect(controller.pick).toHaveBeenCalledWith(target, { x: 5, y: 6 }, target);
  });

  it('hands pointer input made with Alt held to the page, the click without the Alt, instead of starting a comment', async () => {
    const controller = renderOverlay();
    const target = query<HTMLButtonElement>('#target');
    const pageHandler = jest.fn();
    target.addEventListener('click', pageHandler);

    const mouse = (type: string, init: MouseEventInit = {}) => {
      const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        altKey: true,
        ...init,
      });
      target.dispatchEvent(event);
      return event;
    };
    expect(mouse('pointerdown').defaultPrevented).toBe(false);
    expect(mouse('pointerup', { clientX: 5, clientY: 6 }).defaultPrevented).toBe(false);
    // The click is made again for the page: links leave a modified one to the browser.
    expect(mouse('click', { detail: 1, clientX: 5, clientY: 6 }).defaultPrevented).toBe(true);
    // Once the stopped click is over: a checkbox it toggled is toggled back at its end.
    expect(pageHandler).not.toHaveBeenCalled();
    await flush();

    expect(controller.pick).not.toHaveBeenCalled();
    expect(pageHandler).toHaveBeenCalledTimes(1);
    expect(pageHandler.mock.calls[0][0]).toMatchObject({
      type: 'click',
      altKey: false,
      detail: 1,
      clientX: 5,
      clientY: 6,
    });
  });

  it('lets the click a label fires on its control through with the click made with Alt held', async () => {
    const controller = renderOverlay();
    const check = query<HTMLInputElement>('#check');
    const altClick = (element: Element) =>
      element.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, altKey: true })
      );

    altClick(check);
    await flush();
    expect(check.checked).toBe(true);

    altClick(query('#checkLabel'));
    await flush();
    expect(check.checked).toBe(false);
    expect(controller.pick).not.toHaveBeenCalled();
  });

  it('leaves the cursor to the page while Alt is held', () => {
    renderOverlay();
    const commentCursor = () =>
      Array.from(document.querySelectorAll('style')).some((style) =>
        Array.from(style.sheet?.cssRules ?? []).some((rule) => rule.cssText.includes('crosshair'))
      );
    const key = (type: string, altKey: boolean) =>
      act(() => {
        window.dispatchEvent(new KeyboardEvent(type, { key: 'Alt', altKey }));
      });
    expect(commentCursor()).toBe(true);

    key('keydown', true);
    expect(commentCursor()).toBe(false);
    key('keyup', false);
    expect(commentCursor()).toBe(true);

    // Released out of the window (Alt+Tab): no keyup comes.
    key('keydown', true);
    act(() => {
      window.dispatchEvent(new Event('blur'));
    });
    expect(commentCursor()).toBe(true);
  });

  it('keeps a tooltip showing while the pointer moves from its element onto it, to be clicked, and lets the element know of the leave once the pointer is off both', () => {
    const controller = renderOverlay();
    const save = query('#save');
    const saveText = query('#saveText');
    const tip = query('#tip');
    const left = jest.fn((event: MouseEvent) => [event.type, event.target, event.relatedTarget]);
    save.addEventListener('mouseout', left);
    save.addEventListener('mouseleave', left);
    const leave = (target: Element, type: string, x: number, y: number) =>
      target.dispatchEvent(
        new MouseEvent(type, {
          bubbles: type === 'mouseout',
          clientX: x,
          clientY: y,
          relatedTarget: document.body,
        })
      );
    const move = (x: number, y: number) =>
      document.body.dispatchEvent(
        new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y })
      );

    // Away from the tooltip: the leave is the page's, as ever.
    leave(save, 'mouseout', 250, 100);
    expect(left).toHaveBeenCalledTimes(1);
    left.mockClear();

    // Towards it, out of the text at the button's edge, then out of the button into the gap: held back.
    leave(saveText, 'mouseout', 250, 175);
    leave(save, 'mouseout', 250, 190);
    leave(save, 'mouseleave', 250, 190);
    move(250, 220);
    expect(left).not.toHaveBeenCalled();

    // Tooltips take no pointer input: the release lands on what is under them.
    release(document.body, { clientX: 250, clientY: 220 });
    expect(controller.pick).toHaveBeenCalledWith(tip, { x: 250, y: 220 }, tip, {
      revealedBy: save,
    });

    // Off both: the button hears of its leaves, as of a pointer gone nowhere in particular.
    move(250, 300);
    expect(left.mock.results.map(({ value }) => value)).toEqual([
      ['mouseout', saveText, null],
      ['mouseout', save, null],
      ['mouseleave', save, null],
    ]);
    leave(save, 'mouseout', 250, 100);
    expect(left).toHaveBeenCalledTimes(4);
  });

  it('hands the pointer to the page, a tooltip held let go of, while Alt is held', () => {
    renderOverlay();
    const save = query('#save');
    const left = jest.fn((event: MouseEvent) => event.relatedTarget);
    save.addEventListener('mouseout', left);
    const moved = jest.fn();
    document.body.addEventListener('pointermove', moved);
    const move = (x: number, y: number, altKey = false) =>
      query('#target').dispatchEvent(
        new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y, altKey })
      );

    save.dispatchEvent(
      new MouseEvent('mouseout', { bubbles: true, clientX: 250, clientY: 190, relatedTarget: null })
    );
    move(250, 195);
    expect(left).not.toHaveBeenCalled();
    expect(moved).not.toHaveBeenCalled();

    // Alt: the page learns of the leave, to the element under the pointer, and gets the move.
    move(290, 165, true);
    expect(left.mock.results.map(({ value }) => value)).toEqual([save]);
    expect(moved).toHaveBeenCalledTimes(1);
  });

  it("keeps a tooltip showing while the layer's UI at it has focus, the element learning of the blur once focus is back on the page elsewhere", () => {
    renderOverlay();
    const save = query('#save');
    const composer = document.createElement('div');
    composer.setAttribute(IGNORE_ATTR, 'true');
    composer.setAttribute(AT_TOOLTIP_ATTR, 'true');
    composer.innerHTML = '<textarea id="draft"></textarea>';
    document.body.append(composer);
    const draft = query('#draft');
    const blurred = jest.fn((event: FocusEvent) => [event.type, event.relatedTarget]);
    save.addEventListener('blur', blurred);
    save.addEventListener('focusout', blurred);
    const focus = (type: string, element: Element, relatedTarget: Element | null) =>
      element.dispatchEvent(
        new FocusEvent(type, {
          bubbles: type.endsWith('out') || type.endsWith('in'),
          relatedTarget,
        })
      );

    focus('blur', save, draft);
    focus('focusout', save, draft);
    focus('focusin', draft, save);
    expect(blurred).not.toHaveBeenCalled();

    focus('focusin', query('#target'), draft);
    expect(blurred.mock.results.map(({ value }) => value)).toEqual([
      ['blur', query('#target')],
      ['focusout', query('#target')],
    ]);
  });

  it('starts the comment on a tooltip clicked without the pointer having come from its element, revealed by the element referring to it', () => {
    const controller = renderOverlay();
    release(document.body, { clientX: 250, clientY: 220 });
    expect(controller.pick).toHaveBeenCalledWith(query('#tip'), { x: 250, y: 220 }, query('#tip'), {
      revealedBy: query('#save'),
    });

    query('#save').removeAttribute('aria-describedby');
    release(document.body, { clientX: 250, clientY: 220 });
    expect(controller.pick).toHaveBeenLastCalledWith(
      query('#tip'),
      { x: 250, y: 220 },
      query('#tip'),
      undefined
    );
  });

  it('aims at the tooltip the focused element shows with an arrow key, outlining it for Enter to start the comment on it, and back at the element with another', async () => {
    const controller = renderOverlay();
    const save = query('#save');
    const tip = query('#tip');
    const outline = () => document.querySelector('[data-test-subj="devCommentsTooltipAim"]');
    const key = (element: Element, init: KeyboardEventInit) =>
      act(() => {
        keyDown(element, init);
      });
    const focus = (element: HTMLElement) =>
      act(() => {
        element.focus();
      });

    focus(save);
    key(save, { key: 'ArrowDown' });
    expect(outline()).toHaveStyle({ left: '200px', top: '200px', width: '100px', height: '40px' });
    key(save, { key: 'Enter' });
    expect(controller.pick).toHaveBeenLastCalledWith(tip, { x: 250, y: 220 }, tip, {
      revealedBy: save,
    });

    key(save, { key: 'ArrowLeft' });
    expect(outline()).toBeNull();
    key(save, { key: ' ' });
    expect(controller.pick).toHaveBeenLastCalledWith(save, { x: 250, y: 165 }, save);

    // The aim is the focused element's, and goes with the tooltip.
    key(save, { key: 'ArrowUp' });
    expect(outline()).not.toBeNull();
    focus(query('#target'));
    expect(outline()).toBeNull();
    focus(save);
    key(save, { key: 'ArrowUp' });
    await act(async () => {
      tip.remove();
    });
    await waitFor(() => expect(outline()).toBeNull());
    key(save, { key: 'Enter' });
    expect(controller.pick).toHaveBeenLastCalledWith(save, { x: 250, y: 165 }, save);
    expect(controller.pick).toHaveBeenCalledTimes(3);
  });

  it('selects the focused element with Enter or Space, swallowing both key phases', () => {
    const controller = renderOverlay();
    const target = query('#target');
    const pageHandler = jest.fn();
    target.addEventListener('keydown', pageHandler);

    expect(keyDown(target, { key: 'Enter' }).defaultPrevented).toBe(true);
    const keyUp = new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true });
    target.dispatchEvent(keyUp);

    expect(keyUp.defaultPrevented).toBe(true);
    expect(pageHandler).not.toHaveBeenCalled();
    expect(controller.pick).toHaveBeenCalledTimes(1);
    expect(controller.pick).toHaveBeenCalledWith(target, expect.anything(), target);
  });

  it('lets focus movement, Escape and shortcuts through, but no typing or pasting', () => {
    renderOverlay();
    const field = query('#field');
    const pageHandler = jest.fn();
    field.addEventListener('keydown', pageHandler);

    expect(keyDown(field, { key: 'Tab' }).defaultPrevented).toBe(false);
    expect(keyDown(field, { key: 'Escape' }).defaultPrevented).toBe(false);
    expect(keyDown(field, { key: 'c', metaKey: true }).defaultPrevented).toBe(false);
    expect(keyDown(field, { key: 'k', ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(
      false
    );
    expect(pageHandler).toHaveBeenCalledTimes(4);

    expect(keyDown(field, { key: 'a' }).defaultPrevented).toBe(true);
    expect(keyDown(field, { key: 'Backspace' }).defaultPrevented).toBe(true);
    const paste = new Event('paste', { bubbles: true, cancelable: true });
    field.dispatchEvent(paste);
    expect(paste.defaultPrevented).toBe(true);
    expect(pageHandler).toHaveBeenCalledTimes(4);
  });

  it('does not select the document body and leaves the layer and excluded UI alone', () => {
    const controller = renderOverlay();
    const hostHandler = jest.fn();
    query('#hostButton').addEventListener('click', hostHandler);

    keyDown(document.body, { key: 'Enter' });
    expect(controller.pick).not.toHaveBeenCalled();

    expect(keyDown(query('#composer'), { key: 'a' }).defaultPrevented).toBe(false);
    query('#hostButton').dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 })
    );
    expect(hostHandler).toHaveBeenCalledTimes(1);
    expect(controller.pick).not.toHaveBeenCalled();
  });
});
