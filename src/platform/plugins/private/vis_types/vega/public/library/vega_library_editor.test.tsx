/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { StatefulSearchBarProps } from '@kbn/unified-search-plugin/public';
import type { VegaReadResponseBody } from '../../server';
import { setData } from '../services';
import type { VegaPluginStartDependencies } from '../plugin';
import { saveVegaToLibrary } from './save_to_library';
import type { VegaLibraryClient } from './vega_library_client';
import { VegaLibraryEditor } from './vega_library_editor';

jest.mock('../components/vega_vis_editor', () => ({
  VegaSpecEditor: ({
    editorValue,
    onChange,
  }: {
    editorValue: string;
    onChange: (value: string) => void;
  }) => (
    <div>
      <div data-test-subj="vegaSpecEditorValue">{editorValue}</div>
      <button onClick={() => onChange('{ mark: bar }')}>changeSpec</button>
    </div>
  ),
}));

const mockPreview = jest.fn();
jest.mock('@kbn/presentation-util-plugin/public', () => ({
  ...jest.requireActual('@kbn/presentation-util-plugin/public'),
  EmbeddableEditorPreview: (props: { serializedState: unknown; onClose?: () => void }) => {
    mockPreview(props);
    return <div data-test-subj="mockPreview" />;
  },
}));

jest.mock('../default_spec', () => ({ getDefaultSpec: () => '{ mark: default }' }));
jest.mock('./save_to_library', () => ({ saveVegaToLibrary: jest.fn() }));
jest.mock('../lib/extract_index_pattern', () => ({
  extractIndexPatternsFromSpec: jest.fn().mockResolvedValue([]),
}));

const item: { id: string; data: VegaReadResponseBody['data'] } = {
  id: 'item-1',
  data: {
    title: 'My chart',
    description: 'A chart',
    tags: ['tag-1'],
    spec: { format: 'hjson', value: '{ mark: point }' },
  },
};

const lastPreviewState = () => mockPreview.mock.lastCall?.[0].serializedState;

const renderEditor = ({
  canSave = true,
  withItem = true,
}: { canSave?: boolean; withItem?: boolean } = {}) => {
  const core = coreMock.createStart();
  core.uiSettings.get.mockReturnValue([]);
  const client = {
    update: jest.fn().mockResolvedValue({}),
  } as unknown as VegaLibraryClient;
  const closeFlyout = jest.fn();
  const SearchBar = jest.fn((_props: StatefulSearchBarProps): null => null);
  const getSearchBarProps = (): StatefulSearchBarProps => {
    const props = SearchBar.mock.lastCall?.[0];
    if (!props) throw new Error('SearchBar has not rendered');
    return props;
  };

  render(
    <VegaLibraryEditor
      core={core}
      client={client}
      SearchBar={SearchBar as VegaPluginStartDependencies['unifiedSearch']['ui']['SearchBar']}
      item={withItem ? item : undefined}
      canSave={canSave}
      closeFlyout={closeFlyout}
      ariaLabelledBy="vegaLibraryEditorTitle"
    />
  );

  return { core, client, closeFlyout, getSearchBarProps };
};

describe('VegaLibraryEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const data = dataPluginMock.createStartContract();
    jest
      .mocked(data.query.queryString.getDefaultQuery)
      .mockReturnValue({ language: 'lucene', query: '' });
    setData(data);
  });

  describe('a new item', () => {
    it('opens with the default spec and renders it in the preview', async () => {
      renderEditor({ withItem: false });

      expect(
        await screen.findByRole('heading', { name: 'Create Vega visualization' })
      ).toHaveAttribute('id', 'vegaLibraryEditorTitle');
      expect(screen.getByTestId('vegaSpecEditorValue')).toHaveTextContent('{ mark: default }');
      expect(lastPreviewState()).toEqual({ spec: { format: 'hjson', value: '{ mark: default }' } });
    });

    it('saves through the save modal, then reports it and closes', async () => {
      jest.mocked(saveVegaToLibrary).mockResolvedValue({ id: 'new-id', title: 'New chart' });
      const { core, closeFlyout } = renderEditor({ withItem: false });

      await userEvent.click(await screen.findByText('changeSpec'));
      await userEvent.click(screen.getByTestId('vegaLibraryEditorSaveButton'));

      await waitFor(() => expect(closeFlyout).toHaveBeenCalledTimes(1));
      expect(saveVegaToLibrary).toHaveBeenCalledWith(
        expect.objectContaining({
          state: { spec: { format: 'hjson', value: '{ mark: bar }' } },
          initialDetails: undefined,
        })
      );
      expect(core.notifications.toasts.addSuccess).toHaveBeenCalledWith('Saved "New chart"');
    });

    it('stays open when the save modal is dismissed', async () => {
      jest.mocked(saveVegaToLibrary).mockResolvedValue(undefined);
      const { core, closeFlyout } = renderEditor({ withItem: false });

      await userEvent.click(await screen.findByTestId('vegaLibraryEditorSaveButton'));

      await waitFor(() => expect(saveVegaToLibrary).toHaveBeenCalledTimes(1));
      expect(closeFlyout).not.toHaveBeenCalled();
      expect(core.notifications.toasts.addSuccess).not.toHaveBeenCalled();
    });

    it('shows the error and stays open when the item cannot be created', async () => {
      const error = new Error('nope');
      jest.mocked(saveVegaToLibrary).mockRejectedValue(error);
      const { core, closeFlyout } = renderEditor({ withItem: false });

      await userEvent.click(await screen.findByTestId('vegaLibraryEditorSaveButton'));

      await waitFor(() =>
        expect(core.notifications.toasts.addError).toHaveBeenCalledWith(error, {
          title: 'Unable to save Vega visualization',
        })
      );
      expect(closeFlyout).not.toHaveBeenCalled();
    });

    it('has no save menu', async () => {
      renderEditor({ withItem: false });

      await screen.findByTestId('vegaLibraryEditorSaveButton');
      expect(screen.queryByTestId('vegaLibraryEditorSaveButtonMenu')).not.toBeInTheDocument();
    });
  });

  describe('an existing item', () => {
    it('opens with its spec and title', async () => {
      renderEditor();

      expect(
        await screen.findByRole('heading', { name: 'Edit Vega visualization: My chart' })
      ).toBeInTheDocument();
      expect(screen.getByTestId('vegaSpecEditorValue')).toHaveTextContent('{ mark: point }');
      expect(lastPreviewState()).toEqual({
        spec: { format: 'hjson', value: '{ mark: point }' },
      });
    });

    it('cannot be saved until something changes', async () => {
      renderEditor();

      expect(await screen.findByTestId('vegaLibraryEditorSaveButtonPrimary')).toBeDisabled();

      await userEvent.click(screen.getByText('changeSpec'));

      expect(screen.getByTestId('vegaLibraryEditorSaveButtonPrimary')).toBeEnabled();
    });

    it('saves the changes in place and keeps the title, description and tags', async () => {
      const { client, core, closeFlyout } = renderEditor();

      await userEvent.click(await screen.findByText('changeSpec'));
      await userEvent.click(screen.getByTestId('vegaLibraryEditorSaveButtonPrimary'));

      await waitFor(() => expect(closeFlyout).toHaveBeenCalledTimes(1));
      expect(client.update).toHaveBeenCalledWith('item-1', {
        ...item.data,
        spec: { format: 'hjson', value: '{ mark: bar }' },
      });
      expect(saveVegaToLibrary).not.toHaveBeenCalled();
      expect(core.notifications.toasts.addSuccess).toHaveBeenCalledWith('Saved "My chart"');
    });

    it('saves the query and filters with the item', async () => {
      const { client, getSearchBarProps, closeFlyout } = renderEditor();
      await screen.findByText('changeSpec');

      await act(async () => {
        getSearchBarProps().onQuerySubmit?.({
          query: { query: 'status:active', language: 'kuery' },
          dateRange: { from: 'now-15m', to: 'now' },
        });
      });
      await userEvent.click(screen.getByTestId('vegaLibraryEditorSaveButtonPrimary'));

      await waitFor(() => expect(closeFlyout).toHaveBeenCalledTimes(1));
      expect(client.update).toHaveBeenCalledWith(
        'item-1',
        expect.objectContaining({ query: { expression: 'status:active', language: 'kql' } })
      );
    });

    it('shows the error and stays open when the update fails', async () => {
      const { client, core, closeFlyout } = renderEditor();
      const error = new Error('conflict');
      jest.mocked(client.update).mockRejectedValue(error);

      await userEvent.click(await screen.findByText('changeSpec'));
      await userEvent.click(screen.getByTestId('vegaLibraryEditorSaveButtonPrimary'));

      await waitFor(() =>
        expect(core.notifications.toasts.addError).toHaveBeenCalledWith(error, {
          title: 'Unable to save Vega visualization',
        })
      );
      expect(closeFlyout).not.toHaveBeenCalled();
    });

    it('saves a copy with the current draft and the details of the item', async () => {
      jest.mocked(saveVegaToLibrary).mockResolvedValue({ id: 'copy', title: 'Copy' });
      const { client, core, closeFlyout } = renderEditor();

      await userEvent.click(await screen.findByText('changeSpec'));
      await userEvent.click(screen.getByTestId('vegaLibraryEditorSaveButtonMenu'));
      // The menu's popover ignores pointer events while it animates in.
      fireEvent.click(await screen.findByTestId('vegaLibraryEditorSaveAsNewButton'));

      await waitFor(() => expect(closeFlyout).toHaveBeenCalledTimes(1));
      expect(saveVegaToLibrary).toHaveBeenCalledWith(
        expect.objectContaining({
          state: { spec: { format: 'hjson', value: '{ mark: bar }' } },
          initialDetails: { title: 'My chart', description: 'A chart', tags: ['tag-1'] },
        })
      );
      expect(client.update).not.toHaveBeenCalled();
      expect(core.notifications.toasts.addSuccess).toHaveBeenCalledWith('Saved "Copy"');
    });

    it('can save a copy of an unchanged item', async () => {
      jest.mocked(saveVegaToLibrary).mockResolvedValue(undefined);
      renderEditor();

      await userEvent.click(await screen.findByTestId('vegaLibraryEditorSaveButtonMenu'));
      // The menu's popover ignores pointer events while it animates in.
      fireEvent.click(await screen.findByTestId('vegaLibraryEditorSaveAsNewButton'));

      await waitFor(() => expect(saveVegaToLibrary).toHaveBeenCalledTimes(1));
    });
  });

  describe('preview', () => {
    it('only changes when running the preview', async () => {
      renderEditor();
      await userEvent.click(await screen.findByText('changeSpec'));

      expect(lastPreviewState().spec.value).toBe('{ mark: point }');
      expect(screen.getByTestId('vegaLibraryEditorPreviewButton')).toBeEnabled();

      await userEvent.click(screen.getByTestId('vegaLibraryEditorPreviewButton'));

      expect(lastPreviewState().spec.value).toBe('{ mark: bar }');
      expect(screen.getByTestId('vegaLibraryEditorPreviewButton')).toBeDisabled();
    });

    it('follows query and filter changes right away', async () => {
      const { getSearchBarProps } = renderEditor();
      await screen.findByText('changeSpec');

      await act(async () => {
        getSearchBarProps().onQuerySubmit?.({
          query: { query: 'status:active', language: 'kuery' },
          dateRange: { from: 'now-15m', to: 'now' },
        });
      });

      expect(lastPreviewState()).toEqual({
        spec: { format: 'hjson', value: '{ mark: point }' },
        query: { expression: 'status:active', language: 'kql' },
      });
      // Only spec changes need Run preview.
      expect(screen.getByTestId('vegaLibraryEditorPreviewButton')).toBeDisabled();
    });

    it('keeps the previewed spec while applying query changes', async () => {
      const { getSearchBarProps } = renderEditor();
      await userEvent.click(await screen.findByText('changeSpec'));

      await act(async () => {
        getSearchBarProps().onQuerySubmit?.({
          query: { query: 'status:active', language: 'kuery' },
          dateRange: { from: 'now-15m', to: 'now' },
        });
      });

      expect(lastPreviewState().spec.value).toBe('{ mark: point }');
      expect(lastPreviewState().query).toEqual({ expression: 'status:active', language: 'kql' });
      expect(screen.getByTestId('vegaLibraryEditorPreviewButton')).toBeEnabled();
    });

    it('reopens with the run preview button after it is closed', async () => {
      renderEditor();
      await screen.findByTestId('mockPreview');

      await act(async () => {
        mockPreview.mock.lastCall?.[0].onClose();
      });

      expect(screen.queryByTestId('mockPreview')).not.toBeInTheDocument();
      expect(screen.getByTestId('vegaLibraryEditorPreviewButton')).toBeEnabled();

      await userEvent.click(screen.getByTestId('vegaLibraryEditorPreviewButton'));

      expect(screen.getByTestId('mockPreview')).toBeInTheDocument();
      expect(screen.getByTestId('vegaLibraryEditorPreviewButton')).toBeDisabled();
    });

    it('is disabled until the draft differs from the previewed one', async () => {
      renderEditor();

      expect(await screen.findByTestId('vegaLibraryEditorPreviewButton')).toBeDisabled();
    });
  });

  describe('closing', () => {
    it('closes right away when nothing changed', async () => {
      const { closeFlyout } = renderEditor();

      await userEvent.click(await screen.findByTestId('vegaLibraryEditorCancelButton'));

      expect(closeFlyout).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('vegaLibraryEditorDiscardModal')).not.toBeInTheDocument();
    });

    it('asks before discarding changes, and keeps editing on request', async () => {
      const { closeFlyout } = renderEditor();

      await userEvent.click(await screen.findByText('changeSpec'));
      await userEvent.click(screen.getByTestId('vegaLibraryEditorCancelButton'));

      expect(await screen.findByTestId('vegaLibraryEditorDiscardModal')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Keep editing'));

      await waitFor(() =>
        expect(screen.queryByTestId('vegaLibraryEditorDiscardModal')).not.toBeInTheDocument()
      );
      expect(closeFlyout).not.toHaveBeenCalled();
    });

    it('closes after confirming to discard changes', async () => {
      const { closeFlyout } = renderEditor();

      await userEvent.click(await screen.findByText('changeSpec'));
      await userEvent.click(screen.getByTestId('vegaLibraryEditorCancelButton'));
      fireEvent.click(await screen.findByText('Discard changes'));

      await waitFor(() => expect(closeFlyout).toHaveBeenCalledTimes(1));
    });
  });

  describe('without permission to save', () => {
    it('shows a read only badge and no save action', async () => {
      renderEditor({ canSave: false });

      expect(await screen.findByTestId('vegaLibraryEditorReadOnlyBadge')).toBeInTheDocument();
      expect(screen.queryByTestId('vegaLibraryEditorSaveButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('vegaLibraryEditorSaveButtonPrimary')).not.toBeInTheDocument();
      expect(screen.getByTestId('vegaLibraryEditorCancelButton')).toHaveTextContent('Close');
    });

    it('can still be edited and previewed', async () => {
      renderEditor({ canSave: false });

      await userEvent.click(await screen.findByText('changeSpec'));
      await userEvent.click(screen.getByTestId('vegaLibraryEditorPreviewButton'));

      expect(lastPreviewState().spec.value).toBe('{ mark: bar }');
    });

    it('closes without asking, since nothing can be saved', async () => {
      const { closeFlyout } = renderEditor({ canSave: false });

      await userEvent.click(await screen.findByText('changeSpec'));
      await userEvent.click(screen.getByTestId('vegaLibraryEditorCancelButton'));

      expect(closeFlyout).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('vegaLibraryEditorDiscardModal')).not.toBeInTheDocument();
    });

    it('does not show the read only badge to users who can save', async () => {
      renderEditor();

      await screen.findByTestId('vegaLibraryEditorSaveButton');
      expect(screen.queryByTestId('vegaLibraryEditorReadOnlyBadge')).not.toBeInTheDocument();
    });
  });
});
