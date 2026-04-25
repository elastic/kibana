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
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import type { ViewMode } from '@kbn/presentation-publishing';
import { markdownEmbeddableFactory } from './markdown_embeddable';
import type { MarkdownEditorApi } from './types';
import type { MarkdownEmbeddableState } from '../server/embeddable/schemas';
import { markdownEmbeddableSchema } from '../server/embeddable/schemas';

jest.mock('./markdown_client/markdown_client', () => {
  return {
    markdownClient: {
      get: jest.fn(() => {
        return Promise.resolve({
          data: {
            title: 'Markdown from library',
            description: 'some description',
            content: 'Loaded **markdown** content.',
            settings: {
              open_links_in_new_tab: true,
            },
          },
        });
      }),
      create: jest.fn().mockResolvedValue({ id: 'markdown-id-123' }),
      update: jest.fn().mockResolvedValue({ id: 'markdown-id-123' }),
    },
  };
});

const defaultByValueState = {
  content: '[click here](https://example.com)',
  settings: {
    open_links_in_new_tab: true,
  },
};

const renderEmbeddable = async (
  initialState?: MarkdownEmbeddableState,
  lastSavedState?: MarkdownEmbeddableState
) => {
  function getInitialState() {
    return initialState ?? defaultByValueState;
  }
  function getLastSavedState() {
    return lastSavedState ?? getInitialState();
  }
  const parentApiStub = {
    replacePanel: jest.fn(),
    children$: new BehaviorSubject([]),
    removePanel: jest.fn(),
    setFocusedPanelId: jest.fn(),
    addNewPanel: jest.fn(),
    viewMode$: new BehaviorSubject<ViewMode>('view'),
    lastSavedStateForChild$: () => of(getLastSavedState()),
    getLastSavedStateForChild: getLastSavedState,
  };

  const factory = markdownEmbeddableFactory;

  const embeddable = await factory.buildEmbeddable({
    initializeDrilldownsManager: jest.fn(),
    initialState: getInitialState(),
    parentApi: parentApiStub,
    finalizeApi: (api) =>
      ({
        ...api,
        uuid: 'test-uuid',
        parentApi: parentApiStub,
      } as unknown as MarkdownEditorApi),
    uuid: 'test-uuid',
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
    await renderEmbeddable({ ...defaultByValueState, content: '# Heading' });
    expect(screen.getByRole('heading', { name: 'Heading' })).toBeInTheDocument();
  });

  it('renders links with target="_blank"', async () => {
    await renderEmbeddable();
    const link = screen.getByRole('link', { name: /click here/i });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('resolves document relative links against current URL', async () => {
    await renderEmbeddable({ ...defaultByValueState, content: '[go to discover](discover)' });
    const link = screen.getByRole('link', { name: /go to discover/i });
    expect(link).toHaveAttribute('href', '/discover');
  });

  it('does not modify absolute links during relative resolution', async () => {
    await renderEmbeddable({ ...defaultByValueState, content: '[elastic](https://elastic.co)' });
    const link = screen.getByRole('link', { name: /elastic/i });
    expect(link).toHaveAttribute('href', 'https://elastic.co');
  });

  it('shows renderer in view mode, shows editor in edit mode', async () => {
    const { embeddable } = await renderEmbeddable({ ...defaultByValueState, content: 'HELLO' });

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
        ...defaultByValueState,
        content: 'HELLO',
      });

      await act(async () => {
        await embeddable.api.onEdit({ isNewPanel: true });
      });

      await userEvent.click(await screen.findByRole('button', { name: /Discard/i }));
      expect(parentApi.removePanel).toHaveBeenCalledWith('test-uuid');
    });

    it('does not remove panel if not new panel when Discard clicked', async () => {
      const { embeddable, parentApi } = await renderEmbeddable({
        ...defaultByValueState,
        content: 'HELLO',
      });
      await act(async () => {
        await embeddable.api.onEdit({ isNewPanel: false });
      });

      await userEvent.click(await screen.findByRole('button', { name: /Discard/i }));
      expect(parentApi.removePanel).not.toHaveBeenCalled();
    });
  });

  it('saves content when Apply clicked', async () => {
    const { embeddable } = await renderEmbeddable({ ...defaultByValueState, content: 'HELLO' });

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

  it('loads content from library when by reference', async () => {
    const { embeddable } = await renderEmbeddable({ ref_id: '123' });

    expect(embeddable.api.defaultTitle$?.value).toBe('Markdown from library');
    expect(embeddable.api.defaultDescription$?.value).toBe('some description');
  });

  it('can link to library when by value', async () => {
    const { embeddable } = await renderEmbeddable({
      ...defaultByValueState,
      content: 'by value markdown',
    });

    expect(await embeddable.api.canLinkToLibrary()).toBe(true);
  });

  it('can unlink from library when by reference', async () => {
    const { embeddable } = await renderEmbeddable({ ref_id: '123' });

    expect(await embeddable.api.canUnlinkFromLibrary()).toBe(true);
  });

  it('saves to library', async () => {
    const { embeddable } = await renderEmbeddable({
      ...defaultByValueState,
      content: 'by value markdown',
    });

    const newId = await embeddable.api.saveToLibrary('My Markdown Title');
    expect(newId).toBeDefined();
  });

  it('gets serialized state by value', async () => {
    const { embeddable } = await renderEmbeddable();

    expect(embeddable.api.getSerializedStateByValue()).toEqual(defaultByValueState);
  });

  it('gets serialized state by reference', async () => {
    const { embeddable } = await renderEmbeddable({
      ...defaultByValueState,
      content: 'by value markdown',
    });

    expect(embeddable.api.getSerializedStateByReference('new-id')).toEqual({
      ref_id: 'new-id',
    });
  });

  it('unlinks from library', async () => {
    const { embeddable } = await renderEmbeddable({
      ref_id: '123',
      title: 'Some title',
      description: 'some description',
      hide_title: true,
    });

    expect(embeddable.api.getSerializedStateByValue()).toEqual({
      content: 'Loaded **markdown** content.',
      title: 'Some title',
      description: 'some description',
      hide_title: true,
      settings: { open_links_in_new_tab: true },
    });
  });

  describe('open links in new tab setting', () => {
    it('renders links with target="_self" when open_links_in_new_tab is false', async () => {
      await renderEmbeddable({
        content: '[click here](https://example.com)',
        settings: { open_links_in_new_tab: false },
      });
      const link = screen.getByRole('link', { name: /click here/i });
      expect(link).toHaveAttribute('target', '_self');
    });

    it('toggles link target via the settings popover in edit mode', async () => {
      const { embeddable } = await renderEmbeddable({
        content: '[click here](https://example.com)',
        settings: { open_links_in_new_tab: true },
      });

      // Verify initial state: links open in new tab
      expect(screen.getByRole('link', { name: /click here/i })).toHaveAttribute('target', '_blank');

      // Enter edit mode
      await act(async () => {
        await embeddable.api.onEdit();
      });

      // Open the settings popover and toggle the switch off
      await userEvent.click(screen.getByRole('button', { name: /Settings/i }));
      const toggle = await screen.findByRole('switch');
      expect(toggle).toBeChecked();
      await userEvent.click(toggle);

      // Discard to exit edit mode (settings changes are applied immediately, not via Apply)
      await userEvent.click(screen.getByRole('button', { name: /Discard/i }));

      // Links should now open in the same tab
      expect(screen.getByRole('link', { name: /click here/i })).toHaveAttribute('target', '_self');
    });
  });

  describe('unsaved chnages', () => {
    it('should have unsaved changes when content has changed', async () => {
      const lastSavedState = markdownEmbeddableSchema.validate({
        content: 'hello',
      });
      const initialState = markdownEmbeddableSchema.validate({
        content: 'goodbye',
      });
      const { embeddable } = await renderEmbeddable(initialState, lastSavedState);
      const hasUnsavedChanges = await firstValueFrom(embeddable.api.hasUnsavedChanges$);
      expect(hasUnsavedChanges).toBe(true);
    });

    it('should not have unsaved changes for by value state when there are no changes', async () => {
      const initialState = markdownEmbeddableSchema.validate({
        content: 'hello',
      });
      const { embeddable } = await renderEmbeddable(initialState);
      const hasUnsavedChanges = await firstValueFrom(embeddable.api.hasUnsavedChanges$);
      expect(hasUnsavedChanges).toBe(false);
    });

    it('should not have unsaved changes for by reference state when there are no changes', async () => {
      const initialState = markdownEmbeddableSchema.validate({
        ref_id: '1234',
      });
      const { embeddable } = await renderEmbeddable(initialState);
      const hasUnsavedChanges = await firstValueFrom(embeddable.api.hasUnsavedChanges$);
      expect(hasUnsavedChanges).toBe(false);
    });
  });
});
