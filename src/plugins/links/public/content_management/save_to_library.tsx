/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  showSaveModal,
  OnSaveProps,
  SavedObjectSaveModal,
  SaveResult,
} from '@kbn/saved-objects-plugin/public';

import { APP_NAME } from '../../common';
import { NavigationEmbeddableAttributes } from '../../common/content_management';
import {
  NavigationEmbeddableByReferenceInput,
  NavigationEmbeddableInput,
} from '../embeddable/types';
import { checkForDuplicateTitle } from './duplicate_title_check';
import { getNavigationEmbeddableAttributeService } from '../services/attribute_service';

export const runSaveToLibrary = async (
  newAttributes: NavigationEmbeddableAttributes,
  initialInput: NavigationEmbeddableInput
): Promise<NavigationEmbeddableByReferenceInput | undefined> => {
  return new Promise<NavigationEmbeddableByReferenceInput | undefined>((resolve) => {
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

      const updatedInput = (await getNavigationEmbeddableAttributeService().wrapAttributes(
        stateToSave,
        true,
        initialInput
      )) as unknown as NavigationEmbeddableByReferenceInput;

      resolve(updatedInput);
      return { id: updatedInput.savedObjectId };
    };

    const saveModal = (
      <SavedObjectSaveModal
        onSave={onSave}
        onClose={() => resolve(undefined)}
        title={newAttributes.title}
        description={newAttributes.description}
        showDescription
        showCopyOnSave={false}
        objectType={APP_NAME}
      />
    );
    showSaveModal(saveModal);
  });
};
