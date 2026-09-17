/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IGNORE_ATTR } from '../constants';
import { createInMemoryCommentsApi } from '../lib/in_memory_api';
import { createCommentsController } from '../state/comments_controller';
import { CommentsProvider } from './comments_context';
import { CommentModeOverlay } from './comment_mode_overlay';

const createController = () =>
  createCommentsController({
    api: createInMemoryCommentsApi(),
    location: { getPageKey: () => '/page', getPath: () => '/page', subscribe: () => () => {} },
    navigateToPath: async () => {},
    getCurrentUser: async () => ({ username: 'dana' }),
    ignoreSelectors: ['#host'],
  });

const page = document.createElement('div');

const query = (selector: string): HTMLElement => {
  const element = page.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`No element matches ${selector}`);
  }
  return element;
};

const keyDown = (element: Element, init: KeyboardEventInit) => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  element.dispatchEvent(event);
  return event;
};

describe('CommentModeOverlay', () => {
  beforeEach(() => {
    const parsed = new DOMParser().parseFromString(
      `
      <button id="target">Target</button>
      <input id="field" value="before" />
      <div id="host"><button id="hostButton">Host</button></div>
      <div ${IGNORE_ATTR}="true"><textarea id="composer"></textarea></div>
    `,
      'text/html'
    );
    page.replaceChildren(...Array.from(parsed.body.childNodes));
    document.body.appendChild(page);
  });

  afterEach(() => {
    page.remove();
  });

  const renderOverlay = () => {
    const controller = createController();
    controller.pick = jest.fn();
    render(
      <CommentsProvider controller={controller}>
        <CommentModeOverlay />
      </CommentsProvider>
    );
    return controller;
  };

  it('starts a comment on the element under a click, but not on clicks the page synthesizes', () => {
    const controller = renderOverlay();
    const target = query('#target');
    const pageHandler = jest.fn();
    target.addEventListener('click', pageHandler);

    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }));

    expect(pageHandler).not.toHaveBeenCalled();
    expect(controller.pick).toHaveBeenCalledTimes(1);
    expect(controller.pick).toHaveBeenCalledWith(target, expect.anything(), target);
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

  it('lets the download an export starts through', async () => {
    // The Jest setup stubs `URL.createObjectURL` but not `revokeObjectURL`; jsdom cannot
    // navigate, so the click is recorded and stopped at the window.
    if (typeof URL.revokeObjectURL !== 'function') {
      (URL as unknown as Record<string, unknown>).revokeObjectURL = () => {};
    }
    const clicks: Array<{ download: string; defaultPrevented: boolean }> = [];
    const onWindowClick = (event: Event) => {
      if (event.target instanceof HTMLAnchorElement) {
        clicks.push({ download: event.target.download, defaultPrevented: event.defaultPrevented });
      }
      event.preventDefault();
    };
    window.addEventListener('click', onWindowClick);
    jest.useFakeTimers();
    const controller = renderOverlay();

    try {
      await controller.exportAll();
      jest.runOnlyPendingTimers();
    } finally {
      jest.useRealTimers();
      window.removeEventListener('click', onWindowClick);
    }

    expect(controller.store.getState().notice).toBeNull();
    expect(clicks).toEqual([
      { download: expect.stringMatching(/^comments-.*\.json$/), defaultPrevented: false },
    ]);
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
