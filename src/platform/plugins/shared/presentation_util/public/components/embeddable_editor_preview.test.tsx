/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import type { TimeRange } from '@kbn/es-query';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { HasSerializableState, HasSerializedChildState } from '@kbn/presentation-publishing';
import { EmbeddableEditorPreview } from './embeddable_editor_preview';

interface PreviewState {
  value: string;
}

type PreviewApi = DefaultEmbeddableApi<PreviewState> & HasSerializableState<PreviewState>;
type PreviewParentApi = HasSerializedChildState<PreviewState> & {
  timeRange$: BehaviorSubject<TimeRange>;
};

const mockApi = { applySerializedState: jest.fn() };
let mockLayoutMode: 'side-by-side' | 'stacked' = 'side-by-side';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  getFlyoutManagerStore: () => ({
    getState: () => ({ layoutMode: mockLayoutMode }),
    subscribe: () => () => {},
  }),
}));
let mockGetParentApi: (() => Record<string, unknown>) | undefined;

jest.mock('@kbn/embeddable-plugin/public', () => ({
  EmbeddableRenderer: ({
    getParentApi,
    onApiAvailable,
  }: {
    getParentApi: () => Record<string, unknown>;
    onApiAvailable: (api: unknown) => void;
  }) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(() => {
      mockGetParentApi = getParentApi;
      onApiAvailable(mockApi);
    }, [getParentApi, onApiAvailable]);
    return <div data-test-subj="mockEmbeddable" />;
  },
}));

const renderPreview = (
  props: Partial<React.ComponentProps<typeof EmbeddableEditorPreview>> = {}
) => {
  const view = render(
    <EmbeddableEditorPreview
      type="test"
      serializedState={{ value: 'initial' } as PreviewState}
      {...props}
    />
  );
  return {
    ...view,
    rerenderWith: (serializedState: PreviewState) =>
      view.rerender(
        <EmbeddableEditorPreview type="test" serializedState={serializedState} {...props} />
      ),
  };
};

describe('EmbeddableEditorPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.applySerializedState.mockResolvedValue(undefined);
    mockGetParentApi = undefined;
    mockLayoutMode = 'side-by-side';
  });

  it('renders the embeddable and the toolbar', async () => {
    renderPreview({ toolbar: <div data-test-subj="previewToolbar" /> });

    expect(await screen.findByTestId('mockEmbeddable')).toBeInTheDocument();
    expect(screen.getByTestId('previewToolbar')).toBeInTheDocument();
  });

  it('applies the latest serialized state when it changes', async () => {
    const { rerenderWith } = renderPreview();
    await waitFor(() =>
      expect(mockApi.applySerializedState).toHaveBeenLastCalledWith({ value: 'initial' })
    );

    rerenderWith({ value: 'updated' });

    await waitFor(() =>
      expect(mockApi.applySerializedState).toHaveBeenLastCalledWith({ value: 'updated' })
    );
  });

  it('lets the caller override the synthetic parent API', async () => {
    const timeRange$ = new BehaviorSubject<TimeRange>({ from: 'now-1h', to: 'now' });
    render(
      <EmbeddableEditorPreview<PreviewState, PreviewApi, PreviewParentApi>
        type="test"
        serializedState={{ value: 'initial' }}
        getParentApi={() => ({ timeRange$ })}
      />
    );
    await screen.findByTestId('mockEmbeddable');

    const parentApi = mockGetParentApi?.();
    expect(parentApi?.timeRange$).toBe(timeRange$);
    expect(parentApi?.getSerializedStateForChild).toEqual(expect.any(Function));
  });

  it('shows a callout when applying the state fails, and clears it on the next success', async () => {
    mockApi.applySerializedState.mockRejectedValueOnce(new Error('boom'));
    const { rerenderWith } = renderPreview();

    expect(await screen.findByText('Unable to update preview')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();

    await act(async () => {
      rerenderWith({ value: 'fixed' });
    });

    await waitFor(() =>
      expect(screen.queryByText('Unable to update preview')).not.toBeInTheDocument()
    );
  });

  describe('closing', () => {
    it('has no close button beside the editor', async () => {
      renderPreview({ onClose: jest.fn() });

      await screen.findByTestId('mockEmbeddable');
      expect(screen.queryByTestId('euiFlyoutCloseButton')).not.toBeInTheDocument();
    });

    it('can be closed while stacked over the editor', async () => {
      mockLayoutMode = 'stacked';
      const onClose = jest.fn();
      renderPreview({ onClose });

      await act(async () => {
        (await screen.findByTestId('euiFlyoutCloseButton')).click();
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('has no close button while stacked when it cannot be closed', async () => {
      mockLayoutMode = 'stacked';
      renderPreview();

      await screen.findByTestId('mockEmbeddable');
      expect(screen.queryByTestId('euiFlyoutCloseButton')).not.toBeInTheDocument();
    });
  });
});
