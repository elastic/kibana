/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  showSaveModal,
  OnSaveProps,
  SavedObjectSaveModal,
  SaveResult,
} from '@kbn/saved-objects-plugin/public';
import { CONTENT_ID } from '../../common';
import { checkForDuplicateTitle } from './duplicate_title_check';
import { linksClient } from './links_content_management_client';
import { LinksRuntimeState } from '../types';
import { serializeLinksAttributes } from '../lib/serialize_attributes';

const modalTitle = i18n.translate('links.contentManagement.saveModalTitle', {
  defaultMessage: `Save {contentId} panel to library`,
  values: {
    contentId: CONTENT_ID,
  },
});

export const runSaveToLibrary = async (
  newState: LinksRuntimeState
): Promise<LinksRuntimeState | undefined> => {
  return new Promise<LinksRuntimeState | undefined>((resolve, reject) => {
    const onSave = async ({
      newTitle,
      newDescription,
      onTitleDuplicate,
      isTitleDuplicateConfirmed,
    }: OnSaveProps): Promise<SaveResult> => {
      const stateFromSaveModal = {
        title: newTitle,
        description: newDescription,
      };

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

      const { attributes, references } = serializeLinksAttributes(newState);

      const newAttributes = {
        ...attributes,
        ...stateFromSaveModal,
      };

      try {
        const {
          item: { id },
        } = await linksClient.create({
          data: { ...newAttributes, title: newTitle },
          options: { references },
        });
        resolve({
          ...newState,
          defaultPanelTitle: newTitle,
          defaultPanelDescription: newDescription,
          savedObjectId: id,
        });
        return { id };
      } catch (error) {
        reject();
        return { error };
      }
    };

    const saveModal = (
      <SavedObjectSaveModal
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
