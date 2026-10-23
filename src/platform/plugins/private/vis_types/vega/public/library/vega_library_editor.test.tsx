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
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { TimeRange } from '@kbn/es-query';
import { Subject } from 'rxjs';
import type { StatefulSearchBarProps } from '@kbn/unified-search-plugin/public';
import type { VegaReadResponseBody } from '../../server';
import type { VegaEditableState } from '../lib/library_draft';
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
  allowSaveAsNew,
  onPreview,
}: {
  canSave?: boolean;
  allowSaveAsNew?: boolean;
  onPreview?: (state: VegaEditableState) => void;
} = {}) => {
  const core = coreMock.createStart();
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
      item={item}
      canSave={canSave}
      allowSaveAsNew={allowSaveAsNew}
      onPreview={onPreview}
      closeFlyout={closeFlyout}
      ariaLabelledBy="vegaLibraryEditorTitle"
    />
  );

  return { core, client, closeFlyout, getSearchBarProps };
};

describe('VegaLibraryEditor', () => {
  let timefilter: DataPublicPluginStart['query']['timefilter']['timefilter'];

  beforeEach(() => {
    jest.clearAllMocks();
    const data = dataPluginMock.createStartContract();
    jest
      .mocked(data.query.queryString.getDefaultQuery)
      .mockReturnValue({ language: 'lucene', query: '' });
    // Stands in for the global time range, which emits an update whenever it is set.
    ({ timefilter } = data.query.timefilter);
    let time: TimeRange = { from: 'now-15m', to: 'now' };
    const timeUpdate$ = new Subject<void>();
    jest.mocked(timefilter.getTime).mockImplementation(() => time);
    jest.mocked(timefilter.getTimeUpdate$).mockReturnValue(timeUpdate$);
    jest.mocked(timefilter.setTime).mockImplementation((next) => {
      time = next as TimeRange;
      timeUpdate$.next();
    });
    setData(data);
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

    it('cannot be saved with more than 100 filters', async () => {
      const { getSearchBarProps } = renderEditor();
      await userEvent.click(await screen.findByText('changeSpec'));

      await act(async () => {
        getSearchBarProps().onFiltersUpdated?.(
          Array.from({ length: 101 }, () => ({ meta: {}, query: { match_all: {} } }))
        );
      });

      expect(screen.getByTestId('vegaEditorTooManyFiltersCallout')).toBeInTheDocument();
      expect(screen.getByTestId('vegaLibraryEditorSaveButtonPrimary')).toBeDisabled();
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

    it('offers no copy when it is opened from a dashboard panel', async () => {
      renderEditor({ allowSaveAsNew: false });

      await userEvent.click(await screen.findByText('changeSpec'));

      expect(screen.getByTestId('vegaLibraryEditorSaveButton')).toBeEnabled();
      expect(screen.queryByTestId('vegaLibraryEditorSaveButtonMenu')).not.toBeInTheDocument();
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

    it('sets the global time range from the search bar date picker', async () => {
      const { getSearchBarProps } = renderEditor();
      await screen.findByTestId('mockPreview');
      expect(getSearchBarProps().showDatePicker).toBe(true);

      await act(async () => {
        getSearchBarProps().onQuerySubmit?.({ dateRange: { from: 'now-7d', to: 'now' } });
      });

      expect(timefilter.setTime).toHaveBeenCalledWith({ from: 'now-7d', to: 'now' });
      expect(getSearchBarProps().dateRangeFrom).toBe('now-7d');
      expect(mockPreview.mock.lastCall?.[0].getParentApi().timeRange$.getValue()).toEqual({
        from: 'now-7d',
        to: 'now',
      });
    });

    // A spec's `kibanaSetTimeFilter`, such as a brush, sets the global time range.
    it('follows changes to the global time range', async () => {
      const { getSearchBarProps } = renderEditor();
      await screen.findByTestId('mockPreview');

      await act(async () => {
        timefilter.setTime({ from: 'now-1h', to: 'now' });
      });

      expect(getSearchBarProps().dateRangeFrom).toBe('now-1h');
      expect(mockPreview.mock.lastCall?.[0].getParentApi().timeRange$.getValue()).toEqual({
        from: 'now-1h',
        to: 'now',
      });
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

  describe('in a panel', () => {
    it('previews in the panel instead of a preview flyout', async () => {
      const onPreview = jest.fn();
      renderEditor({ onPreview });

      await userEvent.click(await screen.findByText('changeSpec'));
      expect(screen.queryByTestId('mockPreview')).not.toBeInTheDocument();
      await userEvent.click(screen.getByTestId('vegaLibraryEditorPreviewButton'));

      expect(onPreview).toHaveBeenLastCalledWith({
        spec: { format: 'hjson', value: '{ mark: bar }' },
      });
      expect(screen.queryByTestId('mockPreview')).not.toBeInTheDocument();
    });

    it('takes its time range from the dashboard, not a date picker', async () => {
      const { getSearchBarProps } = renderEditor({ onPreview: jest.fn() });
      await screen.findByText('changeSpec');

      expect(getSearchBarProps().showDatePicker).toBe(false);
    });

    it('follows query changes right away, keeping the previewed spec', async () => {
      const onPreview = jest.fn();
      const { getSearchBarProps } = renderEditor({ onPreview });
      await userEvent.click(await screen.findByText('changeSpec'));

      await act(async () => {
        getSearchBarProps().onQuerySubmit?.({
          query: { language: 'kuery', query: 'bytes > 10' },
          dateRange: { from: 'now-15m', to: 'now' },
        });
      });

      expect(onPreview).toHaveBeenLastCalledWith({
        spec: { format: 'hjson', value: '{ mark: point }' },
        query: { language: 'kql', expression: 'bytes > 10' },
      });
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
