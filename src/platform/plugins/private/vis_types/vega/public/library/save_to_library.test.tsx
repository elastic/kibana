/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactElement } from 'react';
import { act, render, screen } from '@testing-library/react';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { saveVegaToLibrary } from './save_to_library';
import type { VegaLibraryClient } from './vega_library_client';

let mockModalProps: {
  title: string;
  description?: string;
  hasLibraryItemWithTitle: (title: string) => Promise<boolean>;
  onSave: (props: {
    newTitle: string;
    newDescription: string;
    newCopyOnSave: boolean;
  }) => Promise<{ id?: string; error?: Error }>;
  onClose: () => void;
};
let mockShownModal: ReactElement | undefined;

jest.mock('@kbn/saved-objects-plugin/public', () => ({
  showSaveModal: (modal: ReactElement) => {
    mockShownModal = modal;
  },
  SavedObjectSaveModalWithSaveResult: (
    props: typeof mockModalProps & { options?: ReactElement }
  ) => {
    mockModalProps = props;
    return <div data-test-subj="mockSaveModal">{props.options}</div>;
  },
}));

const state = { spec: { format: 'hjson' as const, value: '{ mark: bar }' } };

const createClient = () =>
  ({
    create: jest.fn().mockResolvedValue({ id: 'new-id' }),
    search: jest.fn().mockResolvedValue({ data: [] }),
  } as unknown as jest.Mocked<VegaLibraryClient>);

const tagging = {
  ui: {
    components: {
      SavedObjectSaveModalTagSelector: ({
        initialSelection,
        onTagsSelected,
      }: {
        initialSelection: string[];
        onTagsSelected: (tags: string[]) => void;
      }) => (
        <button
          data-test-subj="mockTagSelector"
          data-initial={initialSelection.join(',')}
          onClick={() => onTagsSelected(['tag-2'])}
        />
      ),
    },
  },
} as unknown as SavedObjectsTaggingApi;

const showModal = (params: Partial<Parameters<typeof saveVegaToLibrary>[0]> = {}) => {
  const client = params.client ?? createClient();
  const result = saveVegaToLibrary({ client, state, ...params });
  render(mockShownModal as ReactElement);
  return { client, result };
};

describe('saveVegaToLibrary', () => {
  beforeEach(() => {
    mockShownModal = undefined;
  });

  it('creates the item from the state and the details from the modal', async () => {
    const { client, result } = showModal({ savedObjectsTagging: tagging });

    await act(async () => {
      screen.getByTestId('mockTagSelector').click();
    });
    await act(async () => {
      await mockModalProps.onSave({
        newTitle: 'My chart',
        newDescription: 'A chart',
        newCopyOnSave: false,
      });
    });

    await expect(result).resolves.toEqual({ id: 'new-id', title: 'My chart' });
    expect(client.create).toHaveBeenCalledWith({
      ...state,
      title: 'My chart',
      description: 'A chart',
      tags: ['tag-2'],
    });
  });

  it('leaves out an empty description', async () => {
    const { client } = showModal();

    await act(async () => {
      await mockModalProps.onSave({
        newTitle: 'My chart',
        newDescription: '',
        newCopyOnSave: false,
      });
    });

    expect(client.create).toHaveBeenCalledWith(
      expect.objectContaining({ description: undefined, tags: [] })
    );
  });

  it('starts from the details it is given', () => {
    showModal({
      savedObjectsTagging: tagging,
      initialDetails: { title: 'My chart', description: 'A chart', tags: ['tag-1'] },
    });

    expect(mockModalProps.title).toBe('My chart');
    expect(mockModalProps.description).toBe('A chart');
    expect(screen.getByTestId('mockTagSelector')).toHaveAttribute('data-initial', 'tag-1');
  });

  it('has no tag selector without the tagging API', () => {
    showModal();

    expect(screen.queryByTestId('mockTagSelector')).not.toBeInTheDocument();
  });

  it('flags a title that another item already uses', async () => {
    const client = createClient();
    client.search.mockResolvedValue({
      data: [{ id: '1', data: { title: 'My chart' }, meta: {} }],
      meta: { page: 1, per_page: 20, total: 1 },
    });
    showModal({ client });

    await expect(mockModalProps.hasLibraryItemWithTitle('my chart')).resolves.toBe(true);
    await expect(mockModalProps.hasLibraryItemWithTitle('Another chart')).resolves.toBe(false);
  });

  it('resolves without an item when the modal is dismissed', async () => {
    const { client, result } = showModal();

    mockModalProps.onClose();

    await expect(result).resolves.toBeUndefined();
    expect(client.create).not.toHaveBeenCalled();
  });

  it('rejects when the item cannot be created', async () => {
    const client = createClient();
    const error = new Error('nope');
    client.create.mockRejectedValue(error);
    const { result } = showModal({ client });
    // Attach the assertion first, so the rejection never goes unhandled.
    const rejection = expect(result).rejects.toBe(error);

    await act(async () => {
      await mockModalProps.onSave({
        newTitle: 'My chart',
        newDescription: '',
        newCopyOnSave: false,
      });
    });

    await rejection;
  });
});
