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
import { createHostServices, flush, mockLayout, query, renderPage } from '../test_helpers';
import { CommentsButton } from './comments_button';

describe('CommentsButton', () => {
  mockLayout();

  beforeEach(() => {
    renderPage(`
      <button type="button" id="open" aria-expanded="false">Open details</button>
      <div id="details" hidden><button type="button" id="target">Target</button></div>
    `);
    query('#open').addEventListener('click', () => {
      query('#open').setAttribute('aria-expanded', 'true');
      query('#details').hidden = false;
    });
  });

  it('records the clicks that revealed UI before comment mode was first switched on', async () => {
    const api = createInMemoryCommentsApi();
    render(
      <EuiThemeProvider>
        <div id="toolbar">
          <CommentsButton services={createHostServices({ api, ignoreSelectors: ['#toolbar'] })} />
        </div>
      </EuiThemeProvider>
    );
    await act(flush);

    // The author opens the details, switches comment mode on only then, and
    // comments on an element that the click revealed.
    fireEvent.click(query('#open'));
    fireEvent.click(screen.getByTestId('devCommentsButton'));
    fireEvent.keyDown(query('#target'), { key: 'Enter' });
    fireEvent.change(await screen.findByTestId('devCommentsComposerInput'), {
      target: { value: 'Needs a label' },
    });
    fireEvent.click(screen.getByTestId('devCommentsComposerSubmit'));

    await waitFor(async () => expect(await api.list()).toHaveLength(1));
    const [saved] = await api.list();
    expect(saved.text).toBe('Needs a label');
    expect(saved.trail).toEqual([
      expect.objectContaining({
        label: 'Open details',
        anchor: expect.objectContaining({
          locators: expect.arrayContaining([{ type: 'id', value: 'open' }]),
        }),
      }),
    ]);
  });

  it('leaves comment mode from its own button without the host listing it in `ignoreSelectors`', async () => {
    render(
      <EuiThemeProvider>
        <CommentsButton services={createHostServices()} />
      </EuiThemeProvider>
    );
    await act(flush);
    const button = screen.getByTestId('devCommentsButton');

    fireEvent.click(button, { detail: 1 });
    await screen.findByTestId('devCommentsPanel');
    expect(button).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(button, { detail: 1 });
    await waitFor(() => expect(screen.queryByTestId('devCommentsPanel')).toBeNull());
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('devCommentsComposer')).toBeNull();
  });
});
