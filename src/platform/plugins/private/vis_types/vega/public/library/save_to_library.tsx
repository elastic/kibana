/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { OnSaveProps, SaveResult } from '@kbn/saved-objects-plugin/public';
import {
  SavedObjectSaveModalWithSaveResult,
  showSaveModal,
} from '@kbn/saved-objects-plugin/public';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { VegaEditableState } from '../lib/library_draft';
import type { VegaLibraryClient } from './vega_library_client';
import { hasVegaLibraryItemWithTitle } from './vega_library_client';

/** The details of a library item that the save modal edits. */
export interface VegaLibraryDetails {
  title: string;
  description?: string;
  tags: string[];
}

const modalTitle = i18n.translate('visTypeVega.libraryEditor.saveModalTitle', {
  defaultMessage: 'Save Vega visualization',
});

const objectType = i18n.translate('visTypeVega.libraryEditor.saveModalObjectType', {
  defaultMessage: 'Vega visualization',
});

const SaveVegaModal = ({
  client,
  initialDetails,
  savedObjectsTagging,
  onSave,
  onClose,
}: {
  client: VegaLibraryClient;
  initialDetails?: Partial<VegaLibraryDetails>;
  savedObjectsTagging?: SavedObjectsTaggingApi;
  onSave: (props: OnSaveProps, tags: string[]) => Promise<SaveResult>;
  onClose: () => void;
}) => {
  const [tags, setTags] = useState(initialDetails?.tags ?? []);

  return (
    <SavedObjectSaveModalWithSaveResult
      hasLibraryItemWithTitle={(title) => hasVegaLibraryItemWithTitle(client, title)}
      onSave={(props) => onSave(props, tags)}
      onClose={onClose}
      lastSavedTitle=""
      title={initialDetails?.title ?? ''}
      description={initialDetails?.description}
      showDescription
      showCopyOnSave={false}
      objectType={objectType}
      customModalTitle={modalTitle}
      options={
        savedObjectsTagging ? (
          <savedObjectsTagging.ui.components.SavedObjectSaveModalTagSelector
            initialSelection={tags}
            onTagsSelected={setTags}
            markOptional
          />
        ) : undefined
      }
    />
  );
};

/**
 * Asks for the title, description and tags of a new library item, then creates it from the given
 * state. Resolves with the new item, or `undefined` when the modal is dismissed. Rejects when the
 * item can't be created.
 */
export const saveVegaToLibrary = ({
  client,
  state,
  initialDetails,
  savedObjectsTagging,
}: {
  client: VegaLibraryClient;
  state: VegaEditableState;
  initialDetails?: Partial<VegaLibraryDetails>;
  savedObjectsTagging?: SavedObjectsTaggingApi;
}): Promise<{ id: string; title: string } | undefined> =>
  new Promise((resolve, reject) => {
    const onSave = async (
      { newTitle, newDescription }: OnSaveProps,
      tags: string[]
    ): Promise<SaveResult> => {
      try {
        const { id } = await client.create({
          ...state,
          title: newTitle,
          description: newDescription || undefined,
          tags,
        });
        resolve({ id, title: newTitle });
        return { id };
      } catch (error) {
        reject(error);
        return { error };
      }
    };

    showSaveModal(
      <SaveVegaModal
        client={client}
        initialDetails={initialDetails}
        savedObjectsTagging={savedObjectsTagging}
        onSave={onSave}
        onClose={() => resolve(undefined)}
      />
    );
  });
