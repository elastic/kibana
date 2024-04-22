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

import { extractReferences } from '../../common/persistable_state';
import { CONTENT_ID } from '../../common';
import { LinksAttributes } from '../../common/content_management';
import { checkForDuplicateTitle } from './duplicate_title_check';
import { LinksSerializedState } from '../embeddable/types';
import { linksClient } from './links_content_management_client';

const modalTitle = i18n.translate('links.contentManagement.saveModalTitle', {
  defaultMessage: `Save {contentId} panel to library`,
  values: {
    contentId: CONTENT_ID,
  },
});

export const runQuickSave = async (
  newAttributes: LinksAttributes,
  savedObjectId: string
): Promise<LinksSerializedState | undefined> => {
  const { attributes, references } = extractReferences({
    attributes: newAttributes,
  });

  try {
    const {
      item: { id },
    } = await linksClient.update({
      id: savedObjectId,
      data: attributes,
      options: { references },
    });
    return { savedObjectId: id };
  } catch (error) {
    throw error;
  }
};

export const runSaveToLibrary = async (
  newAttributes: LinksAttributes
): Promise<LinksSerializedState | undefined> => {
  return new Promise<LinksSerializedState | undefined>((resolve, reject) => {
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
          lastSavedTitle: newAttributes.title ?? '',
          copyOnSave: false,
          onTitleDuplicate,
          isTitleDuplicateConfirmed,
        }))
      ) {
        return {};
      }

      const stateToSave = {
        ...newAttributes,
        ...stateFromSaveModal,
      };

      const { attributes, references } = extractReferences({
        attributes: stateToSave,
      });

      try {
        const {
          item: { id },
        } = await linksClient.create({ data: attributes, options: { references } });
        resolve({ savedObjectId: id });
        return { id };
      } catch (error) {
        reject(error);
        return { error };
      }
    };

    const saveModal = (
      <SavedObjectSaveModal
        onSave={onSave}
        onClose={() => resolve(undefined)}
        title={newAttributes.title ?? ''}
        customModalTitle={modalTitle}
        description={newAttributes.description}
        showDescription
        showCopyOnSave={false}
        objectType={CONTENT_ID}
      />
    );
    showSaveModal(saveModal);
  });
};
