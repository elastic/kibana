/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { OnSaveProps, SaveResult } from '@kbn/saved-objects-plugin/public';
import {
  showSaveModal,
  SavedObjectSaveModalWithSaveResult,
} from '@kbn/saved-objects-plugin/public';
import { LINKS_EMBEDDABLE_TYPE, CONTENT_ID } from '../../common';
import { checkForDuplicateTitle } from './duplicate_title_check';
import { linksClient } from './links_content_management_client';
import { serializeResolvedLinks } from '../lib/resolve_links';
import type { EditorState } from '../editor/get_editor_flyout';

const modalTitle = i18n.translate('links.contentManagement.saveModalTitle', {
  defaultMessage: `Save {contentId} panel to library`,
  values: {
    contentId: LINKS_EMBEDDABLE_TYPE,
  },
});

export const runSaveToLibrary = async (newState: EditorState): Promise<EditorState | undefined> => {
  return new Promise<EditorState | undefined>((resolve, reject) => {
    const onSave = async ({
      newTitle,
      newDescription,
      onTitleDuplicate,
      isTitleDuplicateConfirmed,
    }: OnSaveProps): Promise<SaveResult> => {
      if (
        !(await checkForDuplicateTitle({
          title: newTitle,
          lastSavedTitle: newState.title ?? '',
          copyOnSave: false,
          onTitleDuplicate,
          isTitleDuplicateConfirmed,
        }))
      ) {
        return {};
      }

      const newAttributes = {
        ...newState,
        links: serializeResolvedLinks(newState.links ?? []),
        title: newTitle,
        description: newDescription,
      };

      try {
        const {
          item: { id },
        } = await linksClient.create({
          data: newAttributes,
        });
        resolve({
          ...newState,
          title: newTitle,
          description: newDescription,
          savedObjectId: id,
        });
        return { id };
      } catch (error) {
        reject(error);
        return { error };
      }
    };

    const saveModal = (
      <SavedObjectSaveModalWithSaveResult
        onSave={onSave}
        onClose={() => resolve(undefined)}
        title={newState.title ?? ''}
        customModalTitle={modalTitle}
        description={newState.description}
        showDescription
        showCopyOnSave={false}
        objectType={CONTENT_ID}
      />
    );
    showSaveModal(saveModal);
  });
};
