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
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createInMemoryCommentsApi } from '../lib/in_memory_api';
import { createCommentsController } from '../state/comments_controller';
import {
  anchorById,
  createComment,
  createHostServices,
  createLocation,
  deferred,
  editorText,
  flush,
  mockLayout,
  query,
  renderPage,
} from '../test_helpers';
import type { Comment, CommentsHostServices } from '../types';
import { CommentsProvider } from './comments_context';
import { CommentsLayer } from './comments_layer';
import { SETTLE_MS } from './guide_overlay';

const seeded = createComment('a');

const escape = () => fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

/** The element of a piece of HTML, to add to the page as it is (`renderPage` would take the layer's containers away). */
const parse = (html: string): Element =>
  new DOMParser().parseFromString(html, 'text/html').body.firstElementChild!;

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

  const target = () => query('#target');

  it('returns focus to where it was when comment mode ends', async () => {
    const controller = await renderLayer();
    target().focus();

    act(() => controller.setActive(true));
    await screen.findByTestId('devCommentsPanel');
    escape();

    expect(controller.store.getState().active).toBe(false);
    expect(document.activeElement).toBe(target());
  });

  it('lists comments by page, the current page first, in groups that are open but can be closed', async () => {
    const elsewhere = createComment('far', {
      route: { pageKey: '/app/two', path: '/app/two' },
      anchor: anchorById('missing'),
    });
    const controller = await renderLayer({ api: createInMemoryCommentsApi([elsewhere, seeded]) });
    act(() => controller.setActive(true));

    const [current, other] = await screen.findAllByTestId('devCommentsPanelPage');
    expect(current).toHaveTextContent('/page');
    expect(other).toHaveTextContent('/app/two');
    expect(within(current).getByTestId('devCommentsPanelItem-a')).toBeInTheDocument();
    expect(within(other).getByTestId('devCommentsPanelItem-far')).toBeInTheDocument();

    const trigger = within(current).getByText('/page').closest('button') as HTMLButtonElement;
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(within(current).queryByTestId('devCommentsPanelItem-a')).toBeNull();
    expect(within(other).getByTestId('devCommentsPanelItem-far')).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(within(current).getByTestId('devCommentsPanelItem-a')).toBeInTheDocument();
  });

  it('shows when a comment was written the way the host does, or as the local time without it', async () => {
    const fallback = await renderLayer();
    act(() => fallback.setActive(true));
    const row = await screen.findByTestId('devCommentsPanelItem-a');
    expect(within(row).getByText(new Date(seeded.createdAt).toLocaleString())).toBeInTheDocument();
    cleanup();

    const controller = await renderLayer({
      RelativeTime: ({ value }) => <>{`written ${value}`}</>,
    });
    act(() => controller.setActive(true));
    const hosted = await screen.findByTestId('devCommentsPanelItem-a');
    expect(within(hosted).getByText(`written ${seeded.createdAt}`)).toBeInTheDocument();
  });

  it('opens threads from the panel with the keyboard, inline when the element is not on screen', async () => {
    const user = userEvent.setup();
    const gone = createComment('gone', { anchor: anchorById('missing'), text: 'Where did it go' });
    const controller = await renderLayer({ api: createInMemoryCommentsApi([seeded, gone]) });
    act(() => controller.setActive(true));
    const goneRow = await screen.findByTestId('devCommentsPanelItem-gone');
    const preview = within(goneRow).getByRole('button', { name: /Where did it go/ });

    // The element is not on the page: Enter on the preview opens the thread in the
    // row, the text taking the preview's place and focus moving to the toggle that
    // closes it; Space there closes it, bringing the preview back.
    preview.focus();
    await user.keyboard('{Enter}');
    expect(preview).not.toBeInTheDocument();
    expect(within(goneRow).getByTestId('devCommentsReplyInput')).toBeInTheDocument();
    const toggle = within(goneRow).getByTestId('devCommentsPanelToggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(document.activeElement).toBe(toggle);
    await user.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(goneRow).queryByTestId('devCommentsReplyInput')).toBeNull();
    expect(within(goneRow).getByRole('button', { name: /Where did it go/ })).toBeInTheDocument();

    // The element is on the page: Enter opens the thread at its pin, the toggle in the row.
    const seededRow = screen.getByTestId('devCommentsPanelItem-a');
    // Focus leaves the toggle, whose tooltip reacts to that.
    act(() =>
      within(seededRow)
        .getByRole('button', { name: /Comment a/ })
        .focus()
    );
    await user.keyboard('{Enter}');
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByTestId('devCommentsPin-a'))
    );
    fireEvent.click(within(seededRow).getByTestId('devCommentsPanelToggle'));
    expect(within(seededRow).getByTestId('devCommentsReplyInput')).toBeInTheDocument();
  });

  it('renders comments as Markdown, leaving out the HTML and unsafe links anyone could have stored', async () => {
    const text = [
      'Use `EuiButtonEmpty` here, see [the issue](https://github.com/elastic/kibana/issues/1).',
      '<img src=x onerror="alert(1)"> [run](javascript:alert(1))',
    ].join('\n');
    const gone = createComment('gone', { anchor: anchorById('missing'), text });
    const controller = await renderLayer({ api: createInMemoryCommentsApi([gone]) });
    act(() => controller.setActive(true));
    const row = await screen.findByTestId('devCommentsPanelItem-gone');

    // Folded, the row previews the rendered text in a button, with links as text only.
    const preview = within(row).getByRole('button', { name: /Use EuiButtonEmpty here/ });
    expect(within(preview).getByText('EuiButtonEmpty').tagName).toBe('CODE');
    expect(within(preview).queryByRole('link')).toBeNull();
    expect(preview).toHaveTextContent('see the issue.');
    expect(preview.querySelector('img')).toBeNull();

    // Opened, the rendered text with its links takes the preview's place.
    fireEvent.click(preview);
    expect(preview).not.toBeInTheDocument();
    expect(within(row).getByText('EuiButtonEmpty').tagName).toBe('CODE');
    expect(within(row).getByRole('link', { name: 'the issue' })).toHaveAttribute(
      'href',
      'https://github.com/elastic/kibana/issues/1'
    );
    expect(row.querySelector('img')).toBeNull();
    expect(within(row).queryByRole('link', { name: 'run' })).toBeNull();
    expect(row).toHaveTextContent('[run](javascript:alert(1))');
  });

  it('shows that comments are loading, then a failed load with a retry, and the empty state only once loaded', async () => {
    const first = deferred<Comment[]>();
    const list = jest.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce([]);
    const controller = await renderLayer({ api: { ...createInMemoryCommentsApi(), list } });
    act(() => controller.setActive(true));

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
    const controller = await renderLayer({
      api,
      RelativeTime: ({ value }) => <>{`at ${value}`}</>,
    });
    act(() => controller.setActive(true));
    const { loadedAt } = controller.store.getState();
    expect(await screen.findByTestId('devCommentsPanelRefresh')).toHaveTextContent(
      `Updated at ${loadedAt}`
    );

    act(() => controller.openThread('a'));
    const thread = await screen.findByTestId('devCommentsThread');
    expect(within(thread).getByTestId('devCommentsThreadRefresh')).toHaveTextContent(
      `Updated at ${loadedAt}`
    );
    fireEvent.change(editorText('devCommentsReplyInput'), { target: { value: 'Draft' } });

    fireEvent.click(within(thread).getByTestId('devCommentsThreadRefresh'));
    await act(flush);
    expect(list).toHaveBeenCalledTimes(2);
    expect(controller.store.getState().loading).toBe(false);
    expect(within(thread).getByTestId('devCommentsThreadRefresh')).toHaveTextContent(
      `Updated at ${controller.store.getState().loadedAt}`
    );
    expect(editorText('devCommentsReplyInput')).toHaveValue('Draft');
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
      act(() => controller.setActive(true));
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
    act(() => controller.setActive(true));
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

  it('keeps the comment being written, text included, when the page changes under a save that then fails', async () => {
    const { location, navigate } = createLocation();
    const create = deferred<Comment>();
    const controller = await renderLayer({
      api: { ...createInMemoryCommentsApi([seeded]), create: () => create.promise },
      location,
    });
    act(() => controller.setActive(true));
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
    act(() => controller.setActive(true));
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
    act(() => controller.setActive(true));
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
    act(() => controller.setActive(true));
    act(() => controller.openThread('a'));
    const panel = await screen.findByRole('dialog', { name: 'Comment thread' });
    const above = Number(panel.style.zIndex);
    expect(above).toBeGreaterThan(Number(levels.modal));

    act(() => controller.setOverlayOpen(true));
    expect(Number(panel.style.zIndex)).toBeLessThan(Number(levels.mask));

    act(() => controller.setOverlayOpen(false));
    expect(Number(panel.style.zIndex)).toBe(above);
  });

  it('keeps the pins, and the thread the screenshot is shown from, while the full-screen mask covers the page', async () => {
    const controller = await renderLayer();
    act(() => controller.setActive(true));
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
    act(() => controller.setActive(true));
    await screen.findByTestId('devCommentsPanel');
    expect(screen.queryByTestId('devCommentsPin-late')).toBeNull();

    act(() => {
      query('.late').id = 'late';
    });
    expect(await screen.findByTestId('devCommentsPin-late')).toBeInTheDocument();
  });

  it('takes the pin of an element covered by a dialog down with it, and the panel then offers to navigate', async () => {
    const inDialog = createComment('ok', { anchor: anchorById('ok') });
    const controller = await renderLayer({ api: createInMemoryCommentsApi([seeded, inDialog]) });
    act(() => controller.setActive(true));
    expect(await screen.findByTestId('devCommentsPin-a')).toBeInTheDocument();
    const row = screen.getByTestId('devCommentsPanelItem-a');
    expect(within(row).getByTestId('devCommentsPanelOpen')).toBeInTheDocument();

    // The dialog is drawn over the whole page, its button on it.
    const dialog = parse(
      `<div id="dialog" data-rect="0,0,2000,2000"><button id="ok" data-rect="100,100,80,20">OK</button></div>`
    );
    act(() => document.body.append(dialog));
    await waitFor(() => expect(screen.queryByTestId('devCommentsPin-a')).toBeNull());
    expect(await screen.findByTestId('devCommentsPin-ok')).toBeInTheDocument();
    expect(within(row).queryByTestId('devCommentsPanelOpen')).toBeNull();
    expect(within(row).getByTestId('devCommentsPanelGuide')).toBeInTheDocument();

    act(() => dialog.remove());
    expect(await screen.findByTestId('devCommentsPin-a')).toBeInTheDocument();
    expect(within(row).getByTestId('devCommentsPanelOpen')).toBeInTheDocument();
  });

  it('guides to a covered element by waiting for what covers it to be closed', async () => {
    const dialog = parse(`<div id="dialog" data-rect="0,0,2000,2000"></div>`);
    document.body.append(dialog);
    const controller = await renderLayer();
    act(() => controller.setActive(true));
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
    act(() => controller.setActive(true));
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
    act(() => controller.setActive(true));
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
