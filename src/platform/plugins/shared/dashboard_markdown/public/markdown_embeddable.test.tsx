/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import { BehaviorSubject } from 'rxjs';
import type { ViewMode } from '@kbn/presentation-publishing';
import { markdownEmbeddableFactory } from './markdown_embeddable';
import type { MarkdownEditorApi } from './types';

const renderEmbeddable = async (
  overrideParams?: Partial<Parameters<(typeof markdownEmbeddableFactory)['buildEmbeddable']>[0]>
) => {
  const parentApiStub = {
    replacePanel: jest.fn(),
    children$: new BehaviorSubject([]),
    removePanel: jest.fn(),
    setFocusedPanelId: jest.fn(),
    addNewPanel: jest.fn(),
    viewMode$: new BehaviorSubject<ViewMode>('view'),
  };

  const factory = markdownEmbeddableFactory;

  const embeddable = await factory.buildEmbeddable({
    initialState: {
      content: '[click here](https://example.com)',
    },
    parentApi: parentApiStub,
    finalizeApi: (api) =>
      ({
        ...api,
        uuid: 'test-uuid',
        parentApi: parentApiStub,
      } as unknown as MarkdownEditorApi),
    uuid: 'test-uuid',
    ...overrideParams,
  });

  await act(async () => render(<embeddable.Component />));

  // Switch to edit mode, but not yet editing
  act(() => parentApiStub.viewMode$.next('edit'));

  return { embeddable, parentApi: parentApiStub };
};

describe('MarkdownEmbeddable', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders markdown content as HTML', async () => {
    await renderEmbeddable({
      initialState: { content: '# Heading' },
    });
    expect(screen.getByRole('heading', { name: 'Heading' })).toBeInTheDocument();
  });

  it('uses default empty content when no initial content provided', async () => {
    await renderEmbeddable({ initialState: { content: '' } });
    expect(screen.getByTestId('markdownRenderer')).toHaveTextContent(/^$/);
  });

  it('renders links with target="_blank"', async () => {
    await renderEmbeddable();
    const link = screen.getByRole('link', { name: /click here/i });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('shows renderer in view mode, shows editor in edit mode', async () => {
    const { embeddable } = await renderEmbeddable({
      initialState: { content: 'HELLO' },
    });

    expect(screen.getByTestId('markdownRenderer')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Dashboard markdown editor/i)).not.toBeInTheDocument();

    // Actually open the editor
    await act(async () => {
      await embeddable.api.onEdit();
    });

    expect(await screen.findByLabelText(/Dashboard markdown editor/i)).toBeInTheDocument();
    expect(screen.queryByTestId('markdownRenderer')).not.toBeInTheDocument();
  });

  describe('Discard button behavior', () => {
    it('removes panel when Discard clicked for new panel', async () => {
      const { embeddable, parentApi } = await renderEmbeddable({
        initialState: { content: 'HELLO' },
      });

      await act(async () => {
        await embeddable.api.onEdit({ isNewPanel: true });
      });

      await userEvent.click(await screen.findByRole('button', { name: /Discard/i }));
      expect(parentApi.removePanel).toHaveBeenCalledWith('test-uuid');
    });

    it('does not remove panel if not new panel when Discard clicked', async () => {
      const { embeddable, parentApi } = await renderEmbeddable({
        initialState: { content: 'HELLO' },
      });
      await act(async () => {
        await embeddable.api.onEdit({ isNewPanel: false });
      });

      await userEvent.click(await screen.findByRole('button', { name: /Discard/i }));
      expect(parentApi.removePanel).not.toHaveBeenCalled();
    });
  });

  it('saves content when Apply clicked', async () => {
    const { embeddable } = await renderEmbeddable({
      initialState: { content: 'HELLO' },
    });

    await act(async () => {
      await embeddable.api.onEdit({ isNewPanel: true });
    });

    const textarea = await screen.findByRole('textbox');
    await userEvent.type(textarea, ' Updated Markdown!');
    await userEvent.click(screen.getByRole('button', { name: /Apply/i }));

    expect(await screen.findByTestId('markdownRenderer')).toHaveTextContent(
      'HELLO Updated Markdown!'
    );
  });

  it('focuses panel on edit if allowed', async () => {
    const { embeddable, parentApi } = await renderEmbeddable();
    await embeddable.api.onEdit();
    expect(parentApi.setFocusedPanelId).toHaveBeenCalledWith('test-uuid');

    parentApi.setFocusedPanelId.mockClear();
    await embeddable.api.onEdit({ isNewPanel: true });
    expect(parentApi.setFocusedPanelId).toHaveBeenCalledWith('test-uuid');
  });

  it('overrides hover actions only when editing', async () => {
    const { embeddable } = await renderEmbeddable();
    expect(embeddable.api.overrideHoverActions$.getValue()).toBe(false);

    await embeddable.api.onEdit();
    expect(embeddable.api.overrideHoverActions$.getValue()).toBe(true);

    const discardButton = await screen.findByRole('button', { name: /Discard/i });
    await userEvent.click(discardButton);
    expect(embeddable.api.overrideHoverActions$.getValue()).toBe(false);
  });
});
