/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { OverlayStart } from 'kibana/public';
import { SAVE_DUPLICATE_REJECTED } from '../../constants';
import { confirmModalPromise } from './confirm_modal_promise';
import { SavedObject } from '../../types';

export function displayDuplicateTitleConfirmModal(
  savedObject: Pick<SavedObject, 'title' | 'getDisplayName'>,
  overlays: OverlayStart
): Promise<true> {
  const confirmMessage = i18n.translate(
    'savedObjects.confirmModal.saveDuplicateConfirmationMessage',
    {
      defaultMessage: `A {name} with the title '{title}' already exists. Would you like to save anyway?`,
      values: { title: savedObject.title, name: savedObject.getDisplayName() },
    }
  );

  const confirmButtonText = i18n.translate('savedObjects.confirmModal.saveDuplicateButtonLabel', {
    defaultMessage: 'Save {name}',
    values: { name: savedObject.getDisplayName() },
  });
  try {
    return confirmModalPromise(confirmMessage, '', confirmButtonText, overlays);
  } catch (_) {
    return Promise.reject(new Error(SAVE_DUPLICATE_REJECTED));
  }
}
