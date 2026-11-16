/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiThemeProvider, useEuiTheme } from '@elastic/eui';
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createInMemoryCommentsApi } from '../lib/in_memory_api';
import { createCommentsController, type CommentsController } from '../state/comments_controller';
import {
  anchorById,
  createComment,
  createHostServices,
  createLocation,
  deferred,
  editorText,
  flush,
  formatDateLocally,
  mockLayout,
  query,
  renderPage,
} from '../test_helpers';
import type { Comment, CommentsHostServices } from '../types';
import { CommentsProvider } from './comments_context';
import { CommentsLayer } from './comments_layer';
import { SETTLE_MS } from './guide_overlay';

jest.setTimeout(30_000);

const seeded = createComment('a');

const escape = () => fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

/** The time of day, to the second, as the thread shows when it was fetched. */
const clockTime = (iso: string) =>
  formatDateLocally(iso, { hour: 'numeric', minute: '2-digit', second: '2-digit' });

/** The element of a piece of HTML, to add to the page as it is (`renderPage` would take the layer's containers away). */
const parse = (html: string): HTMLElement => {
  const element = new DOMParser().parseFromString(html, 'text/html').body.firstElementChild;
  if (!(element instanceof HTMLElement)) {
    throw new Error('Expected an HTML element');
  }
  return element;
};

describe('CommentsLayer', () => {
  mockLayout();

  beforeEach(() => {
    renderPage(`<button id="target">Target</button>`);
  });

  const renderLayer = async (overrides: Partial<CommentsHostServices> = {}) => {
    const controller = createCommentsController(
      createHostServices({ api: createInMemoryCommentsApi([seeded]), ...overrides })
    );
    controller.start();
    render(
      <EuiThemeProvider>
        <CommentsProvider controller={controller}>
          <CommentsLayer />
        </CommentsProvider>
      </EuiThemeProvider>
    );
    await act(flush);
    return controller;
  };

  /** Enters comment mode with the panel expanded, which it does not start out as. */
  const enter = (controller: CommentsController) =>
    act(() => {
      controller.setActive(true);
      controller.setPanelMinimized(false);
    });

  const target = () => query('#target');

  it('returns focus to where it was when comment mode ends', async () => {
    const controller = await renderLayer();
    target().focus();

    enter(controller);
    await screen.findByTestId('devCommentsPanel');
    escape();

    expect(controller.store.getState().active).toBe(false);
    expect(document.activeElement).toBe(target());
  });

  it('starts with the panel minimized each time, and expands it on request', async () => {
    const controller = await renderLayer();
    act(() => controller.setActive(true));

    await screen.findByTestId('devCommentsPanel');
    expect(screen.queryByTestId('devCommentsPanelItem-a')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
    expect(await screen.findByTestId('devCommentsPanelItem-a')).toBeInTheDocument();

    escape();
    act(() => controller.setActive(true));
    await screen.findByTestId('devCommentsPanel');
    expect(screen.queryByTestId('devCommentsPanelItem-a')).toBeNull();
  });

  it('lists comments by page, the current page first and open, the others closed until opened or arrived at', async () => {
    const { location, navigate } = createLocation();
    const elsewhere = createComment('far', {
      route: { pageKey: '/app/two', path: '/app/two' },
      anchor: anchorById('missing'),
    });
    const controller = await renderLayer({
      location,
      api: createInMemoryCommentsApi([elsewhere, seeded]),
    });
    enter(controller);

    const [current, other] = await screen.findAllByTestId('devCommentsPanelPage');
    expect(current).toHaveTextContent('/page');
    expect(other).toHaveTextContent('/app/two');
    expect(other).toHaveTextContent('1');
    const currentTrigger = within(current).getByRole('button', { name: '/page' });
    const otherTrigger = within(other).getByRole('button', { name: '/app/two' });
    expect(currentTrigger).toHaveAttribute('aria-expanded', 'true');
    expect(within(current).getByTestId('devCommentsPanelItem-a')).toBeInTheDocument();
    expect(otherTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(within(other).queryByTestId('devCommentsPanelItem-far')).toBeNull();

    fireEvent.click(otherTrigger);
    expect(within(other).getByTestId('devCommentsPanelItem-far')).toBeInTheDocument();
    fireEvent.click(currentTrigger);
    expect(within(current).queryByTestId('devCommentsPanelItem-a')).toBeNull();
    fireEvent.click(otherTrigger);

    // Arriving at a page opens its comments.
    act(() => navigate('/app/two'));
    await waitFor(() => expect(screen.getByTestId('devCommentsPanelItem-far')).toBeInTheDocument());
  });

  it('opens the only page listed, whichever it is', async () => {
    const elsewhere = createComment('far', {
      route: { pageKey: '/app/two', path: '/app/two' },
      anchor: anchorById('missing'),
    });
    const controller = await renderLayer({ api: createInMemoryCommentsApi([elsewhere]) });
    enter(controller);
    expect(await screen.findByTestId('devCommentsPanelItem-far')).toBeInTheDocument();
  });

  it('keeps pointer input in the panel menus from the page, which closes popovers on clicks outside of them', async () => {
    const outsideClick = jest.fn();
    const events = ['pointerdown', 'mousedown', 'mouseup', 'click'] as const;
    events.forEach((type) => document.addEventListener(type, outsideClick));
    try {
      const controller = await renderLayer();
      enter(controller);
      const row = await screen.findByTestId('devCommentsPanelItem-a');
      const menus = [
        [screen.getByTestId('devCommentsPanelActions'), 'devCommentsPanelRefresh'],
        [screen.getByTestId('devCommentsPanelFilter'), 'devCommentsPanelShowResolved'],
        [within(row).getByTestId('devCommentsPanelRowActions'), 'devCommentsCopy'],
      ] as const;

      for (const [button, item] of menus) {
        fireEvent.click(button);
        const menuItem = await screen.findByTestId(item);
        outsideClick.mockClear();
        fireEvent.pointerDown(menuItem);
        fireEvent.mouseDown(menuItem);
        fireEvent.mouseUp(menuItem);
        expect(outsideClick).not.toHaveBeenCalled();
        // Not the button EuiPanel makes of anything with an onClick: buttons cannot nest.
        expect(menuItem.closest('[data-popover-panel]')?.tagName).toBe('DIV');
        act(() => menuItem.focus());
        escape();
        await waitFor(() => expect(screen.queryByTestId(item)).toBeNull());
      }
    } finally {
      events.forEach((type) => document.removeEventListener(type, outsideClick));
    }
  });

  it('closes an open menu of the panel on Escape, staying in comment mode', async () => {
    const controller = await renderLayer();
    enter(controller);
    const row = await screen.findByTestId('devCommentsPanelItem-a');
    const menus = [
      [screen.getByTestId('devCommentsPanelActions'), 'devCommentsPanelRefresh'],
      [screen.getByTestId('devCommentsPanelFilter'), 'devCommentsPanelShowResolved'],
      [within(row).getByTestId('devCommentsPanelRowActions'), 'devCommentsPanelShow'],
    ] as const;

    for (const [button, item] of menus) {
      fireEvent.click(button);
      const menuItem = await screen.findByTestId(item);
      act(() => menuItem.focus());
      escape();
      await waitFor(() => expect(screen.queryByTestId(item)).toBeNull());
      expect(controller.store.getState().active).toBe(true);
      expect(document.activeElement).toBe(button);
    }

    // With no menu open, Escape leaves comment mode as before.
    escape();
    expect(controller.store.getState().active).toBe(false);
  });

  it('leaves resolved comments out of the list until asked for, the filter showing as on while it hides some', async () => {
    const done = createComment('done', { resolved: true });
    const controller = await renderLayer({ api: createInMemoryCommentsApi([seeded, done]) });
    enter(controller);

    await screen.findByTestId('devCommentsPanelItem-a');
    expect(screen.queryByTestId('devCommentsPanelItem-done')).toBeNull();
    expect(screen.getByTestId('devCommentsPanelCount')).toHaveTextContent('1');
    const filter = screen.getByTestId('devCommentsPanelFilter');
    expect(filter.className).toContain('base');

    fireEvent.click(filter);
    const toggle = await screen.findByTestId('devCommentsPanelShowResolved');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    expect(screen.getByTestId('devCommentsPanelItem-done')).toBeInTheDocument();
    expect(screen.getByTestId('devCommentsPanelCount')).toHaveTextContent('2');
    expect(filter.className).toContain('empty');

    fireEvent.click(filter);
    fireEvent.click(await screen.findByTestId('devCommentsPanelShowResolved'));
    expect(screen.queryByTestId('devCommentsPanelItem-done')).toBeNull();

    // A comment resolved from the list leaves it; the last one leaves a note that all are.
    fireEvent.click(
      within(screen.getByTestId('devCommentsPanelItem-a')).getByTestId('devCommentsToggleResolved')
    );
    await waitFor(() => expect(screen.queryByTestId('devCommentsPanelItem-a')).toBeNull());
    expect(screen.getByTestId('devCommentsPanelAllResolved')).toBeInTheDocument();
    // Its Resolve button gone, focus moves to the filter that hid it.
    await waitFor(() => expect(document.activeElement).toBe(filter));
  });

  it('moves focus on to the next comment when the one resolved leaves the list, or to the previous one', async () => {
    const comments = ['first', 'second', 'third'].map((id) => createComment(id));
    const controller = await renderLayer({ api: createInMemoryCommentsApi(comments) });
    enter(controller);
    const rowButton = (id: string) =>
      within(screen.getByTestId(`devCommentsPanelItem-${id}`)).getByRole('button', {
        name: new RegExp(`Comment ${id}`),
      });
    const resolve = async (id: string) => {
      const button = within(screen.getByTestId(`devCommentsPanelItem-${id}`)).getByTestId(
        'devCommentsToggleResolved'
      );
      act(() => button.focus());
      fireEvent.click(button);
      await waitFor(() => expect(screen.queryByTestId(`devCommentsPanelItem-${id}`)).toBeNull());
    };

    await screen.findByTestId('devCommentsPanelItem-first');
    await resolve('first');
    await waitFor(() => expect(document.activeElement).toBe(rowButton('second')));

    // The last one has no next: focus goes back to the one before it.
    await resolve('third');
    await waitFor(() => expect(document.activeElement).toBe(rowButton('second')));
  });

  it("shows when a comment was written as a fixed time in the host's formatting, the date unless today's, the full date and time as its tooltip", async () => {
    const formatDate = (iso: string, options: Intl.DateTimeFormatOptions) =>
      `${Object.keys(options).join(' ')} of ${iso}`;
    const today = createComment('today', { createdAt: new Date().toISOString() });
    const controller = await renderLayer({
      api: createInMemoryCommentsApi([seeded, today]),
      formatDate,
    });
    enter(controller);

    const written = within(await screen.findByTestId('devCommentsPanelItem-a')).getByText(
      `month day hour minute of ${seeded.createdAt}`
    );
    expect(written).toHaveAttribute(
      'title',
      `year month day hour minute second of ${seeded.createdAt}`
    );
    within(screen.getByTestId('devCommentsPanelItem-today')).getByText(
      `hour minute of ${today.createdAt}`
    );
  });

  it('takes the reader to a comment from its row with the keyboard: its pin, or the guide to it when the element is not on screen', async () => {
    const user = userEvent.setup();
    const gone = createComment('gone', { anchor: anchorById('missing'), text: 'Where did it go' });
    const controller = await renderLayer({ api: createInMemoryCommentsApi([seeded, gone]) });
    enter(controller);

    // The element is on the page: Enter opens the thread at its pin, which takes focus.
    const seededRow = await screen.findByTestId('devCommentsPanelItem-a');
    within(seededRow)
      .getByRole('button', { name: /Comment a/ })
      .focus();
    await user.keyboard('{Enter}');
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByTestId('devCommentsPin-a'))
    );

    // The element is not on the page: the row says so, and Enter starts the guide to it.
    const goneRow = screen.getByTestId('devCommentsPanelItem-gone');
    const row = within(goneRow).getByRole('button', { name: /Where did it go/ });
    expect(row).toHaveAccessibleName(expect.stringContaining('Comment not visible'));
    act(() => row.focus());
    await user.keyboard('{Enter}');
    expect(controller.store.getState().guide).toEqual({ id: 'gone', navigating: false });
    expect(within(goneRow).queryByTestId('devCommentsReplyInput')).toBeNull();
  });

  it('renders comments as Markdown, leaving out the HTML and unsafe links anyone could have stored', async () => {
    const text = [
      'Use `EuiButtonEmpty` here, see [the issue](https://github.com/elastic/kibana/issues/1).',
      '<img src=x onerror="alert(1)"> [run](javascript:alert(1))',
    ].join('\n');
    const pinned = createComment('pinned', { text });
    const controller = await renderLayer({ api: createInMemoryCommentsApi([pinned]) });
    enter(controller);
    const row = await screen.findByTestId('devCommentsPanelItem-pinned');

    // The row previews the rendered text in a button, with links as text only.
    const preview = within(row).getByRole('button', { name: /Use EuiButtonEmpty here/ });
    expect(within(preview).getByText('EuiButtonEmpty').tagName).toBe('CODE');
    expect(within(preview).queryByRole('link')).toBeNull();
    expect(preview).toHaveTextContent('see the issue.');
    expect(preview.querySelector('img')).toBeNull();

    // Opened at its pin, the thread shows the rendered text with its links.
    fireEvent.click(preview);
    const thread = await screen.findByTestId('devCommentsThread');
    expect(within(thread).getByText('EuiButtonEmpty').tagName).toBe('CODE');
    expect(within(thread).getByRole('link', { name: 'the issue' })).toHaveAttribute(
      'href',
      'https://github.com/elastic/kibana/issues/1'
    );
    expect(thread.querySelector('img')).toBeNull();
    expect(within(thread).queryByRole('link', { name: 'run' })).toBeNull();
    expect(thread).toHaveTextContent('[run](javascript:alert(1))');
  });

  it('shows that comments are loading, then a failed load with a retry, and the empty state only once loaded', async () => {
    const first = deferred<Comment[]>();
    const list = jest.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce([]);
    const controller = await renderLayer({ api: { ...createInMemoryCommentsApi(), list } });
    enter(controller);

    await screen.findByTestId('devCommentsPanelLoading');
    expect(screen.queryByText(/No comments yet/)).toBeNull();
    expect(screen.queryByTestId('devCommentsPanelCount')).toBeNull();

    act(() => first.reject(new Error('offline')));
    await act(flush);
    expect(screen.getByTestId('devCommentsPanelLoadError')).toHaveTextContent('offline');
    expect(screen.queryByTestId('devCommentsPanelLoading')).toBeNull();
    expect(screen.queryByText(/No comments yet/)).toBeNull();

    fireEvent.click(screen.getByTestId('devCommentsPanelRetry'));
    await act(flush);
    expect(screen.queryByTestId('devCommentsPanelLoadError')).toBeNull();
    expect(screen.getByText(/No comments yet/)).toBeInTheDocument();
    expect(screen.getByTestId('devCommentsPanelCount')).toHaveTextContent('0');
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('shows when the comments were fetched, and fetches them again on request without dropping a reply being written', async () => {
    const api = createInMemoryCommentsApi([seeded]);
    const list = jest.spyOn(api, 'list');
    const controller = await renderLayer({ api });
    enter(controller);

    act(() => controller.openThread('a'));
    const thread = await screen.findByTestId('devCommentsThread');
    fireEvent.change(editorText('devCommentsReplyInput'), { target: { value: 'Draft' } });

    // The panel fetches them again from its menu.
    fireEvent.click(await screen.findByTestId('devCommentsPanelActions'));
    fireEvent.click(await screen.findByTestId('devCommentsPanelRefresh'));
    await act(flush);
    expect(list).toHaveBeenCalledTimes(2);
    const { loadedAt, loading } = controller.store.getState();
    expect(loading).toBe(false);
    expect(within(thread).getByTestId('devCommentsThreadRefresh')).toHaveTextContent(
      `Updated ${clockTime(loadedAt ?? '')}`
    );
    expect(editorText('devCommentsReplyInput')).toHaveValue('Draft');
  });

  it('fetches one thread again on its own from the thread, replies made elsewhere included', async () => {
    const api = createInMemoryCommentsApi([seeded, createComment('b')]);
    const list = jest.spyOn(api, 'list');
    const get = jest.spyOn(api, 'get');
    const controller = await renderLayer({ api });
    enter(controller);

    act(() => controller.openThread('a'));
    const thread = await screen.findByTestId('devCommentsThread');
    const before = controller.store.getState().loadedAt;

    // Someone else replies in the meantime.
    await api.update('a', {
      reply: { author: { username: 'other', displayName: 'Other' }, text: 'From elsewhere' },
    });
    fireEvent.change(editorText('devCommentsReplyInput'), { target: { value: 'Draft' } });
    // In one act: the popover follows the thread as it shows the fetch and grows by the reply.
    await act(async () => {
      fireEvent.click(within(thread).getByTestId('devCommentsThreadRefresh'));
      await flush();
    });

    expect(within(thread).getByText('From elsewhere')).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('a');
    expect(list).toHaveBeenCalledTimes(1);
    expect(editorText('devCommentsReplyInput')).toHaveValue('Draft');
    const { refreshedAt, loadedAt, refreshingIds } = controller.store.getState();
    expect(loadedAt).toBe(before);
    expect(refreshedAt.a).toEqual(expect.any(String));
    expect(refreshingIds.size).toBe(0);
    expect(within(thread).getByTestId('devCommentsThreadRefresh')).toHaveTextContent(
      `Updated ${clockTime(refreshedAt.a)}`
    );
  });

  it('takes a thread off the list when the comment turns out to be gone', async () => {
    const api = createInMemoryCommentsApi([seeded]);
    jest.spyOn(api, 'get').mockResolvedValue(undefined);
    const controller = await renderLayer({ api });
    enter(controller);

    act(() => controller.openThread('a'));
    const thread = await screen.findByTestId('devCommentsThread');
    fireEvent.click(within(thread).getByTestId('devCommentsThreadRefresh'));
    await act(flush);

    expect(screen.queryByTestId('devCommentsThread')).toBeNull();
    expect(screen.queryByTestId('devCommentsPanelItem-a')).toBeNull();
    expect(controller.store.getState().notice).toEqual({
      type: 'error',
      message: 'The comment no longer exists.',
    });
  });

  it('copies the text of a comment, and nothing else, to the clipboard', async () => {
    const copied: string[] = [];
    // jsdom has no clipboard; EUI copies through a selection and this command.
    document.execCommand = jest.fn(() => {
      copied.push(String(window.getSelection()));
      return true;
    });
    try {
      const controller = await renderLayer();
      enter(controller);
      act(() => controller.openThread('a'));
      const thread = await screen.findByTestId('devCommentsThread');
      fireEvent.click(within(thread).getByTestId('devCommentsCopy'));
      // The "Copied." tooltip changes the popover's content, which EUI then repositions.
      await act(flush);
      expect(copied).toEqual([seeded.text]);
    } finally {
      delete (document as Partial<Document>).execCommand;
    }
  });

  it('keeps a draft that is being saved when Escape is pressed, and discards one that is not', async () => {
    const controller = await renderLayer();
    enter(controller);
    act(() => controller.pick(target(), { x: 20, y: 20 }));
    await screen.findByTestId('devCommentsComposer');

    const setSaving = (saving: boolean) =>
      act(() =>
        controller.store.setState(({ pending }) => {
          if (!pending) {
            throw new Error('No draft');
          }
          return { pending: { ...pending, saving } };
        })
      );

    setSaving(true);
    escape();
    expect(controller.store.getState().pending?.saving).toBe(true);
    expect(controller.store.getState().active).toBe(true);

    setSaving(false);
    escape();
    expect(controller.store.getState().pending).toBeNull();
    expect(controller.store.getState().active).toBe(true);
  });

  it('does not send the focus back to the element a moved draft left, only to the one it ended on', async () => {
    renderPage(`<button id="target">Target</button><button id="other">Other</button>`);
    const controller = await renderLayer();
    enter(controller);
    act(() => controller.pick(target(), { x: 20, y: 20 }));
    await screen.findByTestId('devCommentsComposerInput');
    act(() => editorText('devCommentsComposerInput').focus());

    // Another click moves the draft while the composer stays open.
    act(() => controller.pick(query('#other'), { x: 40, y: 40 }));
    expect(document.activeElement).not.toBe(target());
    await act(flush);
    expect(document.activeElement).not.toBe(target());
    expect(screen.getByTestId('devCommentsComposerInput')).toBeInTheDocument();

    escape();
    expect(controller.store.getState().pending).toBeNull();
    expect(document.activeElement).toBe(query('#other'));
  });

  it('sends the focus back to the element showing the tooltip a draft was on, the tooltip itself taking none', async () => {
    renderPage(`
      <button id="save" type="button" aria-describedby="tip" data-rect="0,0,50,20">Save</button>
      <div id="tip" role="tooltip" data-rect="0,30,120,20">Saves the rule</div>
    `);
    const controller = await renderLayer();
    enter(controller);
    act(() =>
      controller.pick(query('#tip'), { x: 60, y: 40 }, query('#tip'), {
        revealedBy: query('#save'),
      })
    );
    await screen.findByTestId('devCommentsComposerInput');
    act(() => editorText('devCommentsComposerInput').focus());

    escape();
    expect(controller.store.getState().pending).toBeNull();
    expect(document.activeElement).toBe(query('#save'));
  });

  it('keeps the comment being written, text included, when the page changes under a save that then fails', async () => {
    const { location, navigate } = createLocation();
    const create = deferred<Comment>();
    const controller = await renderLayer({
      api: { ...createInMemoryCommentsApi([seeded]), create: () => create.promise },
      location,
    });
    enter(controller);
    act(() => controller.pick(target(), { x: 20, y: 20 }));
    await screen.findByTestId('devCommentsComposerInput');
    fireEvent.change(editorText('devCommentsComposerInput'), { target: { value: 'Kept' } });
    fireEvent.click(screen.getByTestId('devCommentsComposerSubmit'));
    await waitFor(() => expect(controller.store.getState().pending?.saving).toBe(true));

    act(() => navigate('/other'));
    act(() => create.reject(new Error('offline')));
    await act(flush);

    expect(controller.store.getState().pending?.saving).toBe(false);
    expect(editorText('devCommentsComposerInput')).toHaveValue('Kept');
  });

  it('posts a reply written in the editor with Cmd+Enter, and clears the draft', async () => {
    const controller = await renderLayer();
    enter(controller);
    act(() => controller.openThread('a'));
    const thread = await screen.findByTestId('devCommentsThread');

    fireEvent.change(editorText('devCommentsReplyInput'), { target: { value: 'Posted' } });
    expect(controller.store.getState().drafts).toEqual({ a: 'Posted' });
    fireEvent.keyDown(editorText('devCommentsReplyInput'), { key: 'Enter', metaKey: true });
    await within(thread).findByText('Posted');
    expect(controller.store.getState().drafts).toEqual({});
    expect(editorText('devCommentsReplyInput')).toHaveValue('');
  });

  it('keeps clicks on pins and threads from the page, which closes popovers on clicks outside of them', async () => {
    renderPage(
      `<button id="target">Target</button><div id="host"><button id="hostButton">Host</button></div>`
    );
    // How EUI's popovers and flyouts notice a click outside of them.
    const outsideClick = jest.fn();
    document.addEventListener('mouseup', outsideClick);
    const controller = await renderLayer({ ignoreSelectors: ['#host'] });
    enter(controller);
    const pin = await screen.findByTestId('devCommentsPin-a');

    fireEvent.mouseUp(pin);
    fireEvent.click(pin);
    await screen.findByTestId('devCommentsReplyInput');
    fireEvent.mouseUp(editorText('devCommentsReplyInput'));
    expect(outsideClick).not.toHaveBeenCalled();

    fireEvent.mouseUp(query('#hostButton'));
    expect(outsideClick).toHaveBeenCalledTimes(1);
    document.removeEventListener('mouseup', outsideClick);
  });

  it('puts its popovers under a screenshot shown full screen, and back above the page after', async () => {
    const { levels } = renderHook(() => useEuiTheme(), { wrapper: EuiThemeProvider }).result.current
      .euiTheme;
    const controller = await renderLayer();
    enter(controller);
    act(() => controller.openThread('a'));
    const panel = await screen.findByRole('dialog', { name: 'Comment thread' });
    const above = Number(panel.style.zIndex);
    expect(above).toBeGreaterThan(Number(levels.modal));
    // Not over the page's toasts, though: that is for threads at tooltips.
    expect(above).toBeLessThan(Number(levels.toast));

    act(() => controller.setOverlayOpen(true));
    expect(Number(panel.style.zIndex)).toBeLessThan(Number(levels.mask));

    act(() => controller.setOverlayOpen(false));
    expect(Number(panel.style.zIndex)).toBe(above);
  });

  it('loads the screenshot again, after a load that failed, when it is hidden and shown again', async () => {
    const api = createInMemoryCommentsApi([
      createComment('a', {
        snapshot: { mimeType: 'image/jpeg', width: 800, height: 600, image: 'AAAA' },
      }),
    ]);
    const getSnapshot = jest.spyOn(api, 'getSnapshot').mockRejectedValueOnce(new Error('offline'));
    const controller = await renderLayer({ api });
    act(() => controller.setActive(true));
    act(() => controller.openThread('a'));
    const thread = await screen.findByTestId('devCommentsThread');

    fireEvent.click(within(thread).getByTestId('devCommentsShowSnapshot'));
    expect(
      await within(thread).findByText(
        'The screenshot could not be loaded. Hide and show it to try again.'
      )
    ).toBeInTheDocument();

    fireEvent.click(within(thread).getByTestId('devCommentsShowSnapshot'));
    fireEvent.click(within(thread).getByTestId('devCommentsShowSnapshot'));
    expect(await within(thread).findByAltText(/Screenshot of the UI/)).toHaveAttribute(
      'src',
      'data:image/jpeg;base64,AAAA'
    );
    expect(getSnapshot).toHaveBeenCalledTimes(2);

    // Loaded, it is kept: hiding and showing it again asks for nothing.
    fireEvent.click(within(thread).getByTestId('devCommentsShowSnapshot'));
    fireEvent.click(within(thread).getByTestId('devCommentsShowSnapshot'));
    expect(within(thread).getByAltText(/Screenshot of the UI/)).toBeInTheDocument();
    expect(getSnapshot).toHaveBeenCalledTimes(2);
    // The thread's popover repositions to the content, a tick later.
    await act(flush);
  });

  it('keeps the pins, and the thread the screenshot is shown from, while the full-screen mask covers the page', async () => {
    const controller = await renderLayer();
    enter(controller);
    act(() => controller.openThread('a'));
    await screen.findByRole('dialog', { name: 'Comment thread' });

    // The mask EUI draws over the whole page, which is not marked as the layer's.
    const mask = parse(`<div data-rect="0,0,2000,2000"></div>`);
    act(() => {
      controller.setOverlayOpen(true);
      document.body.append(mask);
    });
    // Two frames: the layout tick the mask sets off, and the render after it.
    await act(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )
    );
    expect(screen.getByTestId('devCommentsPin-a')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Comment thread' })).toBeInTheDocument();

    // Closed, the mask gone with it, everything is as before; had the mask stayed, it would count.
    act(() => {
      controller.setOverlayOpen(false);
      mask.remove();
    });
    await act(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )
    );
    expect(screen.getByTestId('devCommentsPin-a')).toBeInTheDocument();
    act(() => document.body.append(mask));
    await waitFor(() => expect(screen.queryByTestId('devCommentsPin-a')).toBeNull());
  });

  it('pins a comment once its element gets the id it is anchored by, with nothing added to the page', async () => {
    // A control rendered as a placeholder and finalized in place changes no layout.
    renderPage(`<button id="target">Target</button><button class="late">Late</button>`);
    const late = createComment('late', { anchor: anchorById('late') });
    const controller = await renderLayer({ api: createInMemoryCommentsApi([late]) });
    enter(controller);
    await screen.findByTestId('devCommentsPanel');
    expect(screen.queryByTestId('devCommentsPin-late')).toBeNull();

    act(() => {
      query('.late').id = 'late';
    });
    expect(await screen.findByTestId('devCommentsPin-late')).toBeInTheDocument();
  });

  it('takes the pin of an element covered by a dialog down with it, and the panel then shows it as not visible', async () => {
    const inDialog = createComment('ok', { anchor: anchorById('ok') });
    const controller = await renderLayer({ api: createInMemoryCommentsApi([seeded, inDialog]) });
    enter(controller);
    expect(await screen.findByTestId('devCommentsPin-a')).toBeInTheDocument();
    const row = screen.getByTestId('devCommentsPanelItem-a');
    expect(within(row).queryByTestId('devCommentsPanelNotVisible')).toBeNull();

    // The dialog is drawn over the whole page, its button on it.
    const dialog = parse(
      `<div id="dialog" data-rect="0,0,2000,2000"><button id="ok" data-rect="100,100,80,20">OK</button></div>`
    );
    act(() => document.body.append(dialog));
    await waitFor(() => expect(screen.queryByTestId('devCommentsPin-a')).toBeNull());
    expect(await screen.findByTestId('devCommentsPin-ok')).toBeInTheDocument();
    expect(within(row).getByTestId('devCommentsPanelNotVisible')).toBeInTheDocument();

    act(() => dialog.remove());
    expect(await screen.findByTestId('devCommentsPin-a')).toBeInTheDocument();
    expect(within(row).queryByTestId('devCommentsPanelNotVisible')).toBeNull();
  });

  it('shows a comment whose element cannot be found in the panel, with its screenshot, from the guide', async () => {
    const lost = createComment('lost', {
      anchor: anchorById('missing'),
      text: 'Where did it go',
      snapshot: { mimeType: 'image/jpeg', width: 800, height: 600, image: 'AAAA' },
    });
    const api = createInMemoryCommentsApi([lost]);
    const getSnapshot = jest.spyOn(api, 'getSnapshot');
    const controller = await renderLayer({ api });
    enter(controller);
    await screen.findByTestId('devCommentsPanelItem-lost');

    jest.useFakeTimers();
    try {
      await act(() => controller.guideTo(lost));
      expect(screen.queryByTestId('devCommentsGuideShow')).toBeNull();
      act(() => jest.advanceTimersByTime(SETTLE_MS));
      expect(screen.getByTestId('devCommentsGuide')).toHaveTextContent('cannot be found');
    } finally {
      jest.useRealTimers();
    }
    const show = screen.getByTestId('devCommentsGuideShow');
    expect(show).toHaveTextContent('View screenshot');
    expect(document.activeElement).toBe(show);

    // The thread takes the list's place, the guide ends, and the screenshot is shown from the start.
    fireEvent.click(show);
    const thread = await screen.findByTestId('devCommentsPanelThread');
    expect(screen.queryByTestId('devCommentsGuide')).toBeNull();
    expect(screen.queryByTestId('devCommentsPanelItem-lost')).toBeNull();
    expect(within(thread).getByText('Where did it go')).toBeInTheDocument();
    expect(within(thread).getByTestId('devCommentsShowSnapshot')).toHaveTextContent(
      'Hide screenshot'
    );
    expect(getSnapshot).toHaveBeenCalledWith('lost');
    expect(within(thread).getByTestId('devCommentsReplyInput')).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByTestId('devCommentsPanelBack'));

    // Back in the list, focus returns to the comment's row.
    fireEvent.click(screen.getByTestId('devCommentsPanelBack'));
    const row = await screen.findByTestId('devCommentsPanelItem-lost');
    expect(screen.queryByTestId('devCommentsPanelThread')).toBeNull();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        within(row).getByRole('button', { name: /Where did it go/ })
      )
    );
  });

  it('returns focus to the page, or to the filter, when going back to a row that is not listed', async () => {
    const elsewhere = createComment('far', {
      route: { pageKey: '/app/two', path: '/app/two' },
      anchor: anchorById('missing'),
    });
    const controller = await renderLayer({ api: createInMemoryCommentsApi([seeded, elsewhere]) });
    enter(controller);
    await screen.findByTestId('devCommentsPanelItem-a');

    // Its page is closed: focus goes to the page's header.
    act(() => controller.showInPanel('far'));
    fireEvent.click(await screen.findByTestId('devCommentsPanelBack'));
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: '/app/two' }))
    );

    // Resolved while shown, it is filtered out: focus goes to the filter.
    act(() => controller.showInPanel('a'));
    const thread = await screen.findByTestId('devCommentsPanelThread');
    fireEvent.click(within(thread).getByTestId('devCommentsToggleResolved'));
    await waitFor(() =>
      expect(within(thread).getByTestId('devCommentsToggleResolved')).toHaveAttribute(
        'aria-label',
        'Unresolve this thread'
      )
    );
    fireEvent.click(screen.getByTestId('devCommentsPanelBack'));
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByTestId('devCommentsPanelFilter'))
    );
    expect(screen.queryByTestId('devCommentsPanelItem-a')).toBeNull();
  });

  it('goes back to the list on Escape from a thread shown in the panel, focus on its row', async () => {
    const controller = await renderLayer();
    enter(controller);
    await screen.findByTestId('devCommentsPanelItem-a');

    act(() => controller.showInPanel('a'));
    await screen.findByTestId('devCommentsPanelThread');
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByTestId('devCommentsPanelBack'))
    );
    escape();
    expect(controller.store.getState().active).toBe(true);
    expect(screen.queryByTestId('devCommentsPanelThread')).toBeNull();
    const row = screen.getByTestId('devCommentsPanelItem-a');
    await waitFor(() =>
      expect(document.activeElement).toBe(within(row).getByRole('button', { name: /Comment a/ }))
    );

    // From the list, Escape leaves comment mode as before.
    escape();
    expect(controller.store.getState().active).toBe(false);
  });

  it('finds the row to go back to by its id, even one with selector syntax in it', async () => {
    const id = 'comment-"1]';
    const controller = await renderLayer({ api: createInMemoryCommentsApi([createComment(id)]) });
    enter(controller);
    await screen.findByTestId(`devCommentsPanelItem-${id}`);

    act(() => controller.showInPanel(id));
    fireEvent.click(await screen.findByTestId('devCommentsPanelBack'));
    const row = await screen.findByTestId(`devCommentsPanelItem-${id}`);
    await waitFor(() =>
      expect(document.activeElement).toBe(within(row).getByRole('button', { name: /Comment/ }))
    );
  });

  it('shows any comment in the panel from its row menu', async () => {
    const controller = await renderLayer();
    enter(controller);
    const row = await screen.findByTestId('devCommentsPanelItem-a');

    fireEvent.click(within(row).getByTestId('devCommentsPanelRowActions'));
    fireEvent.click(await screen.findByTestId('devCommentsPanelShow'));
    const thread = await screen.findByTestId('devCommentsPanelThread');
    expect(within(thread).getByText(seeded.text)).toBeInTheDocument();
    // Without a screenshot, there is none to show.
    expect(within(thread).queryByTestId('devCommentsShowSnapshot')).toBeNull();
    expect(screen.queryByTestId('devCommentsPanelFilter')).toBeNull();

    // Leaving comment mode forgets it.
    act(() => controller.setActive(false));
    enter(controller);
    expect(await screen.findByTestId('devCommentsPanelItem-a')).toBeInTheDocument();
    expect(screen.queryByTestId('devCommentsPanelThread')).toBeNull();
  });

  it('shows one thread at a time: a pin opened while the panel shows a thread takes its place', async () => {
    const controller = await renderLayer();
    enter(controller);
    const pin = await screen.findByTestId('devCommentsPin-a');

    act(() => controller.showInPanel('a'));
    await screen.findByTestId('devCommentsPanelThread');
    fireEvent.click(pin);
    await waitFor(() => expect(screen.queryByTestId('devCommentsPanelThread')).toBeNull());
    expect(screen.getAllByTestId('devCommentsThread')).toHaveLength(1);
    expect(screen.getByTestId('devCommentsPanelItem-a')).toBeInTheDocument();
    expect(controller.store.getState()).toMatchObject({ activeThreadId: 'a', panelThreadId: null });
  });

  it('guides to a covered element by waiting for what covers it to be closed', async () => {
    const dialog = parse(`<div id="dialog" data-rect="0,0,2000,2000"></div>`);
    document.body.append(dialog);
    const controller = await renderLayer();
    enter(controller);
    // Timers are faked before the guide starts, so that its settle time can be passed.
    jest.useFakeTimers();
    try {
      await act(() => controller.guideTo(seeded));
      expect(screen.getByTestId('devCommentsGuide')).toHaveTextContent('Looking for the comment…');
      act(() => jest.advanceTimersByTime(SETTLE_MS));
      expect(screen.getByTestId('devCommentsGuide')).toHaveTextContent(
        'The commented element is behind other UI, like a dialog or menu: close it to get to the comment.'
      );
      expect(screen.getByTestId('devCommentsGuideStop')).toHaveTextContent('Cancel');
      expect(controller.store.getState().activeThreadId).toBeNull();
    } finally {
      jest.useRealTimers();
    }

    act(() => dialog.remove());
    await waitFor(() => expect(controller.store.getState().activeThreadId).toBe('a'));
    expect(screen.queryByTestId('devCommentsGuide')).not.toBeInTheDocument();
    expect(screen.getByTestId('devCommentsPin-a')).toHaveAttribute('aria-expanded', 'true');
  });

  it('guides to the recorded control only, not to another one that took its place', async () => {
    // The comment is on something the "Show details" button disclosed; the guide
    // asks for that click. The button is stored by its structural path as well,
    // which another control gets by standing where it stood after a UI change.
    renderPage(
      `<div id="toolbar"><button type="button" aria-expanded="false">Show details</button></div>`
    );
    const guided = createComment('guided', {
      anchor: anchorById('details'),
      trail: [
        {
          label: 'Show details',
          anchor: {
            locators: [
              {
                type: 'cssPath',
                selector: '[id="toolbar"] > button',
                fingerprint: 'button|Show details',
              },
            ],
            relativeX: 0.5,
            relativeY: 0.5,
          },
        },
      ],
    });
    const controller = await renderLayer({ api: createInMemoryCommentsApi([guided]) });
    enter(controller);
    await act(() => controller.guideTo(guided));

    expect(await screen.findByTestId('devCommentsGuideHighlight')).toBeInTheDocument();
    expect(screen.getByTestId('devCommentsGuide')).toHaveTextContent(
      'Click “Show details” to get to the comment'
    );

    act(() => {
      query('#toolbar button').textContent = 'Delete everything';
    });

    await waitFor(() =>
      expect(screen.queryByTestId('devCommentsGuideHighlight')).not.toBeInTheDocument()
    );
    expect(screen.getByTestId('devCommentsGuide')).toHaveTextContent('Looking for the comment…');
  });

  it('guides to a comment on a tooltip by asking for the hover that reveals it, and then opens the thread at its pin, leaving focus where it is', async () => {
    // The page shows the tooltip while the button is hovered, describing the button by it.
    renderPage(
      `<button id="save" type="button" aria-label="Save" data-rect="0,0,50,20">S</button>`
    );
    const save = query('#save');
    save.addEventListener('mouseover', () => {
      document.body.append(
        parse(
          `<div id="saveTip" role="tooltip" data-rect="0,30,120,20"><p id="saveTipText" data-rect="0,30,120,20">Saves the rule</p></div>`
        )
      );
      save.setAttribute('aria-describedby', 'saveTip');
    });
    const guided = createComment('guided', {
      anchor: anchorById('saveTipText'),
      trail: [{ kind: 'hover', label: 'Save', anchor: anchorById('save') }],
    });
    const controller = await renderLayer({ api: createInMemoryCommentsApi([guided]) });
    enter(controller);
    await act(() => controller.guideTo(guided));

    expect(await screen.findByTestId('devCommentsGuideHighlight')).toBeInTheDocument();
    expect(screen.getByTestId('devCommentsGuide')).toHaveTextContent(
      'Hover over “Save” to get to the comment'
    );

    // Unlike a control to click, the element to hover over is not given focus: the
    // tooltip would go as focus left it again. Focus stays with the guide.
    expect(document.activeElement).toBe(screen.getByTestId('devCommentsGuideStop'));
    await act(async () => fireEvent.mouseOver(save));
    const pin = await screen.findByTestId('devCommentsPin-guided');
    await screen.findByRole('dialog', { name: 'Comment thread' });
    expect(screen.queryByTestId('devCommentsGuide')).toBeNull();
    expect(controller.store.getState()).toMatchObject({
      activeThreadId: 'guided',
      focusPinId: null,
      guide: null,
    });
    // Nor does the pin take focus, from what may be showing the tooltip.
    expect(document.activeElement).not.toBe(pin);
  });

  it('pins a comment on a tooltip over the tooltip while it shows, with its thread at the pin, back along with the tooltip once that shows again', async () => {
    const { levels } = renderHook(() => useEuiTheme(), { wrapper: EuiThemeProvider }).result.current
      .euiTheme;
    renderPage(`<button id="save" type="button" data-rect="0,0,50,20">Save</button>`);
    const onTip = createComment('onTip', {
      anchor: {
        locators: [{ type: 'text', tag: '[role="tooltip"]', value: 'Saves the rule' }],
        relativeX: 0.5,
        relativeY: 0.5,
      },
    });
    const controller = await renderLayer({ api: createInMemoryCommentsApi([onTip]) });
    enter(controller);
    expect(screen.queryByTestId('devCommentsPin-onTip')).toBeNull();

    const tip = parse(`<div role="tooltip" data-rect="0,30,120,20">Saves the rule</div>`);
    await act(async () => {
      document.body.append(tip);
    });
    const pin = await screen.findByTestId('devCommentsPin-onTip');
    // Over the tooltip, which EUI draws at the toasts' level; other pins stay under the panel.
    expect(Number(query('#devCommentsTooltipPins').style.zIndex)).toBeGreaterThan(
      Number(levels.toast)
    );
    expect(pin.closest('#devCommentsTooltipPins')).not.toBeNull();
    expect(Number(query('#devCommentsPins').style.zIndex)).toBeLessThan(Number(levels.toast));

    // The click leaves focus, which keeps a tooltip showing, where it is.
    expect(fireEvent.mouseDown(pin)).toBe(false);
    fireEvent.click(pin);
    const thread = await screen.findByRole('dialog', { name: 'Comment thread' });
    expect(Number(thread.style.zIndex)).toBeGreaterThan(Number(levels.toast));
    expect(pin).toHaveAttribute('aria-expanded', 'true');
    expect(controller.store.getState()).toMatchObject({
      activeThreadId: 'onTip',
      panelThreadId: null,
    });

    // The tooltip goes: the pin and thread with it, to be back as it shows again.
    await act(async () => {
      tip.remove();
    });
    await waitFor(() => expect(screen.queryByTestId('devCommentsPin-onTip')).toBeNull());
    expect(screen.queryByRole('dialog', { name: 'Comment thread' })).toBeNull();
    expect(controller.store.getState()).toMatchObject({ activeThreadId: 'onTip' });

    await act(async () => {
      document.body.append(tip);
    });
    await screen.findByTestId('devCommentsPin-onTip');
    await screen.findByRole('dialog', { name: 'Comment thread' });
  });

  it('opens the screenshot of a tooltip comment full screen without the tooltip, and the comment, going', async () => {
    const { levels } = renderHook(() => useEuiTheme(), { wrapper: EuiThemeProvider }).result.current
      .euiTheme;
    renderPage(
      `<button id="save" type="button" aria-describedby="tip" data-rect="0,0,80,20">Save</button>`
    );
    const tip = parse(`<div id="tip" role="tooltip" data-rect="0,30,120,20">Saves the rule</div>`);
    const onTip = createComment('onTip', {
      anchor: {
        locators: [{ type: 'text', tag: '[role="tooltip"]', value: 'Saves the rule' }],
        relativeX: 0.5,
        relativeY: 0.5,
      },
      snapshot: { mimeType: 'image/jpeg', width: 800, height: 600, image: 'AAAA' },
    });
    const controller = await renderLayer({ api: createInMemoryCommentsApi([onTip]) });
    enter(controller);
    await act(async () => {
      document.body.append(tip);
    });
    // As EUI draws it: above the screenshot's mask, which sits under the toasts.
    tip.style.zIndex = String(levels.toast);

    // As EUI does: the tooltip goes when the pointer leaves the button.
    const save = query('#save');
    const left = jest.fn(() => tip.remove());
    save.addEventListener('mouseleave', left);
    const leaveTowardTip = (type: string) =>
      save.dispatchEvent(
        new MouseEvent(type, {
          bubbles: type === 'mouseout',
          clientX: 40,
          clientY: 25,
          relatedTarget: tip,
        })
      );
    leaveTowardTip('mouseout');
    leaveTowardTip('mouseleave');
    expect(left).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByTestId('devCommentsPin-onTip'));
    const thread = await screen.findByRole('dialog', { name: 'Comment thread' });
    fireEvent.click(within(thread).getByTestId('devCommentsShowSnapshot'));
    fireEvent.click(await within(thread).findByTestId('activateFullScreenButton'));

    expect(await screen.findByTestId('fullScreenOverlayMask')).toBeInTheDocument();
    expect(screen.getByTestId('devCommentsThread')).toBeInTheDocument();
    expect(tip.isConnected).toBe(true);
    expect(left).not.toHaveBeenCalled();
    // Under the mask, so it does not cover the screenshot; still showing, so the comment stays.
    expect(Number(tip.style.zIndex)).toBeLessThan(Number(levels.mask));

    // The pointer wanders across the screenshot, far from the tooltip.
    act(() => {
      document.body.dispatchEvent(
        new MouseEvent('pointermove', { bubbles: true, clientX: 900, clientY: 500 })
      );
    });
    expect(left).not.toHaveBeenCalled();
    expect(screen.getByTestId('devCommentsThread')).toBeInTheDocument();

    // Closed, the comment is still there; once the pointer is off, the tooltip goes and the pin with it.
    fireEvent.click(screen.getByTestId('deactivateFullScreenButton'));
    expect(screen.queryByTestId('fullScreenOverlayMask')).not.toBeInTheDocument();
    expect(screen.getByTestId('devCommentsThread')).toBeInTheDocument();
    expect(left).not.toHaveBeenCalled();
    expect(tip.style.zIndex).toBe(String(levels.toast));

    act(() => {
      document.body.dispatchEvent(
        new MouseEvent('pointermove', { bubbles: true, clientX: 900, clientY: 500 })
      );
    });
    expect(left).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByTestId('devCommentsThread')).not.toBeInTheDocument());
    expect(controller.store.getState().activeThreadId).toBe('onTip');
  });

  it('marks a comment being written on a tooltip over the tooltip, like its pin will be, and one on the page under the panel', async () => {
    const { levels } = renderHook(() => useEuiTheme(), { wrapper: EuiThemeProvider }).result.current
      .euiTheme;
    renderPage(`
      <button id="target" type="button" data-rect="0,0,50,20">Target</button>
      <div id="tip" role="tooltip" data-rect="0,30,120,20">Saves the rule</div>
    `);
    const controller = await renderLayer();
    enter(controller);

    act(() => controller.pick(query('#tip'), { x: 60, y: 40 }));
    await screen.findByTestId('devCommentsComposer');
    expect(Number(query('#devCommentsComposer').style.zIndex)).toBeGreaterThan(
      Number(levels.toast)
    );

    // Another click moves the draft onto the page.
    act(() => controller.pick(target(), { x: 20, y: 10 }));
    await waitFor(() =>
      expect(Number(query('#devCommentsComposer').style.zIndex)).toBeLessThan(Number(levels.toast))
    );
  });

  it('asks again for a click that turned out to need an earlier one, in the order the author made them', async () => {
    // The author selected a tab and opened a flyout with the selected tab's
    // content, where the comment is. The flyout button can be clicked right away,
    // so the guide asks for it first, as the click closest to the comment; the
    // flyout then shows the other tab's content, over the tabs.
    renderPage(`
      <button id="tab-a" role="tab" aria-selected="true" data-rect="0,0,50,20">Tab A</button>
      <button id="tab-b" role="tab" aria-selected="false" data-rect="60,0,50,20">Tab B</button>
      <button id="open" type="button" aria-expanded="false" data-rect="200,0,50,20">Open</button>
    `);
    const tabB = query('#tab-b');
    tabB.addEventListener('click', () => {
      query('#tab-a').setAttribute('aria-selected', 'false');
      tabB.setAttribute('aria-selected', 'true');
    });
    query('#open').addEventListener('click', () => {
      const content =
        tabB.getAttribute('aria-selected') === 'true'
          ? `<button id="detail" data-rect="520,20,100,20">Detail</button>`
          : `<p data-rect="520,20,100,20">Nothing for Tab A</p>`;
      document.body.append(
        parse(`<div id="mask" data-rect="0,0,2000,2000"></div>`),
        parse(`<div id="flyout" role="dialog" data-rect="500,0,300,600">${content}</div>`)
      );
    });
    const closeFlyout = () =>
      document.querySelectorAll('#mask, #flyout').forEach((element) => element.remove());
    const guided = createComment('guided', {
      anchor: anchorById('detail'),
      trail: [
        { label: 'Tab B', anchor: anchorById('tab-b') },
        { label: 'Open', anchor: anchorById('open') },
      ],
    });
    const controller = await renderLayer({ api: createInMemoryCommentsApi([guided]) });
    enter(controller);
    const guide = () => screen.getByTestId('devCommentsGuide');

    jest.useFakeTimers();
    try {
      await act(() => controller.guideTo(guided));
      expect(guide()).toHaveTextContent('Click “Open” to get to the comment');

      await act(async () => fireEvent.click(query('#open')));
      act(() => jest.advanceTimersByTime(SETTLE_MS));
      expect(guide()).toHaveTextContent(
        '“Tab B” is behind other UI, like a dialog or menu: close it to get to the comment.'
      );

      await act(async () => closeFlyout());
      await waitFor(() => expect(guide()).toHaveTextContent('Click “Tab B” to get to the comment'));
      await act(async () => fireEvent.click(tabB));
      await waitFor(() => expect(guide()).toHaveTextContent('Click “Open” to get to the comment'));
      await act(async () => fireEvent.click(query('#open')));
      await waitFor(() => expect(controller.store.getState().activeThreadId).toBe('guided'));
      expect(screen.queryByTestId('devCommentsGuide')).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  it('waits for the host to open the comment page before looking for it, even on the same page in another state', async () => {
    // The page key does not tell the two states apart, and the element is already there.
    const { location, navigate } = createLocation('/page?state=1');
    const navigation = deferred<void>();
    const navigateToPath = jest.fn(async (path: string) => {
      await navigation.promise;
      navigate(path);
    });
    const guided = createComment('a', { route: { pageKey: '/page', path: '/page?state=2' } });
    const controller = await renderLayer({
      api: createInMemoryCommentsApi([guided]),
      location,
      navigateToPath,
    });
    enter(controller);
    let guiding!: Promise<void>;
    act(() => {
      guiding = controller.guideTo(guided);
    });
    await act(flush);

    expect(navigateToPath).toHaveBeenCalledWith('/page?state=2');
    expect(screen.getByTestId('devCommentsGuide')).toHaveTextContent('Looking for the comment…');
    expect(controller.store.getState()).toEqual(
      expect.objectContaining({ guide: { id: 'a', navigating: true }, activeThreadId: null })
    );

    await act(async () => {
      navigation.resolve();
      await guiding;
    });
    await waitFor(() => expect(controller.store.getState().activeThreadId).toBe('a'));
    expect(controller.store.getState().guide).toBeNull();
    expect(screen.queryByTestId('devCommentsGuide')).not.toBeInTheDocument();
  });
});
