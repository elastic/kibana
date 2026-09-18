/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiThemeProvider } from '@elastic/eui';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createInMemoryCommentsApi } from '../lib/in_memory_api';
import { createCommentsController } from '../state/comments_controller';
import {
  anchorById,
  createComment,
  createHostServices,
  createLocation,
  deferred,
  flush,
  mockLayout,
  query,
  renderPage,
} from '../test_helpers';
import type { Comment, CommentsHostServices } from '../types';
import { CommentsProvider } from './comments_context';
import { CommentsLayer } from './comments_layer';

const seeded = createComment('a');

const escape = () => fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

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

  it('gives the pin focus when its thread is opened from the panel', async () => {
    const controller = await renderLayer();
    act(() => controller.setActive(true));
    const row = await screen.findByTestId('devCommentsPanelItem-a');

    fireEvent.click(row.querySelector('.euiPanel') ?? row);

    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByTestId('devCommentsPin-a'))
    );
    expect(controller.store.getState()).toEqual(
      expect.objectContaining({ activeThreadId: 'a', focusPinId: null })
    );
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
    fireEvent.change(await screen.findByTestId('devCommentsComposerInput'), {
      target: { value: 'Kept' },
    });
    fireEvent.click(screen.getByTestId('devCommentsComposerSubmit'));
    await waitFor(() => expect(controller.store.getState().pending?.saving).toBe(true));

    act(() => navigate('/other'));
    act(() => create.reject(new Error('offline')));
    await act(flush);

    expect(controller.store.getState().pending?.saving).toBe(false);
    expect(screen.getByTestId('devCommentsComposerInput')).toHaveValue('Kept');
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
      'Click “Show details” to get to the comment.'
    );

    act(() => {
      query('#toolbar button').textContent = 'Delete everything';
    });

    await waitFor(() =>
      expect(screen.queryByTestId('devCommentsGuideHighlight')).not.toBeInTheDocument()
    );
    expect(screen.getByTestId('devCommentsGuide')).toHaveTextContent('Looking for the comment…');
  });
});
