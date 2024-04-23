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
import { LinksAttributes } from '../../common/content_management';
import { LinksByReferenceInput, LinksInput } from '../embeddable/types';
import { checkForDuplicateTitle } from './duplicate_title_check';
import { getLinksAttributeService } from '../services/attribute_service';

const modalTitle = i18n.translate('links.contentManagement.saveModalTitle', {
  defaultMessage: `Save {contentId} panel to library`,
  values: {
    contentId: CONTENT_ID,
  },
});

export const runSaveToLibrary = async (
  newAttributes: LinksAttributes,
  initialInput: LinksInput
): Promise<LinksByReferenceInput | undefined> => {
  return new Promise<LinksByReferenceInput | undefined>((resolve) => {
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
          lastSavedTitle: newAttributes.title,
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

      const updatedInput = (await getLinksAttributeService().wrapAttributes(
        stateToSave,
        true,
        initialInput
      )) as unknown as LinksByReferenceInput;

      resolve(updatedInput);
      return { id: updatedInput.savedObjectId };
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
