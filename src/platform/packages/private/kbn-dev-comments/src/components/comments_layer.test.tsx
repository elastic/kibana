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
import type { Comment, CommentsHostServices } from '../types';
import { CommentsProvider } from './comments_context';
import { CommentsLayer } from './comments_layer';

const seeded: Comment = {
  id: 'a',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  author: { username: 'dana', displayName: 'Dana' },
  text: 'Seeded',
  resolved: false,
  replies: [],
  route: { pageKey: '/page', path: '/page' },
  anchor: { locators: [{ type: 'id', value: 'target' }], relativeX: 0.5, relativeY: 0.5 },
  trail: [],
};

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

const escape = () => fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

describe('CommentsLayer', () => {
  const page = document.createElement('div');

  beforeAll(() => {
    // jsdom has no layout; every element gets a box so anchors resolve and pins are on screen.
    Element.prototype.scrollIntoView = jest.fn();
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 10,
      y: 10,
      left: 10,
      top: 10,
      width: 100,
      height: 20,
      right: 110,
      bottom: 30,
      toJSON: () => {},
    });
  });

  afterAll(() => jest.restoreAllMocks());

  beforeEach(() => {
    page.innerHTML = `<button id="target">Target</button>`;
    document.body.appendChild(page);
  });

  afterEach(() => page.remove());

  const renderLayer = async (overrides: Partial<CommentsHostServices> = {}) => {
    const controller = createCommentsController({
      api: createInMemoryCommentsApi([seeded]),
      location: { getPageKey: () => '/page', getPath: () => '/page', subscribe: () => () => {} },
      navigateToPath: async () => {},
      getCurrentUser: async () => ({ username: 'dana' }),
      ...overrides,
    });
    controller.start();
    render(
      <EuiThemeProvider>
        <CommentsProvider controller={controller}>
          <CommentsLayer />
        </CommentsProvider>
      </EuiThemeProvider>
    );
    await flush();
    return controller;
  };

  const target = (): HTMLElement => {
    const element = document.getElementById('target');
    if (!element) {
      throw new Error('No target element');
    }
    return element;
  };

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
    const listeners = new Set<() => void>();
    let path = '/page';
    let rejectCreate!: (error: Error) => void;
    const api = createInMemoryCommentsApi([seeded]);
    const controller = await renderLayer({
      api: { ...api, create: () => new Promise((_, reject) => (rejectCreate = reject)) },
      location: {
        getPageKey: () => path,
        getPath: () => path,
        subscribe: (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      },
    });
    act(() => controller.setActive(true));
    act(() => controller.pick(target(), { x: 20, y: 20 }));
    fireEvent.change(await screen.findByTestId('devCommentsComposerInput'), {
      target: { value: 'Kept' },
    });
    fireEvent.click(screen.getByTestId('devCommentsComposerSubmit'));
    await waitFor(() => expect(controller.store.getState().pending?.saving).toBe(true));

    act(() => {
      path = '/other';
      listeners.forEach((listener) => listener());
    });
    act(() => rejectCreate(new Error('offline')));
    await flush();

    expect(controller.store.getState().pending?.saving).toBe(false);
    expect(screen.getByTestId('devCommentsComposerInput')).toHaveValue('Kept');
  });
});
