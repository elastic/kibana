/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { OverlayStart } from '@kbn/core/public';
import type { VisSavedObject } from '../../types';
import { SAVE_DUPLICATE_REJECTED } from './constants';
import { confirmModalPromise } from './confirm_modal_promise';

export function displayDuplicateTitleConfirmModal(
  savedObject: Pick<VisSavedObject, 'title'>,
  overlays: OverlayStart
): Promise<boolean> {
  const confirmTitle = i18n.translate(
    'visualizations.confirmModal.saveDuplicateConfirmationTitle',
    {
      defaultMessage: `This visualization already exists`,
    }
  );

  const confirmMessage = i18n.translate(
    'visualizations.confirmModal.saveDuplicateConfirmationMessage',
    {
      defaultMessage: `Saving "{name}" creates a duplicate title. Would you like to save anyway?`,
      values: { name: savedObject.title },
    }
  );

  const confirmButtonText = i18n.translate('visualizations.confirmModal.saveDuplicateButtonLabel', {
    defaultMessage: 'Save',
  });

  try {
    return confirmModalPromise(confirmMessage, confirmTitle, confirmButtonText, overlays);
  } catch {
    return Promise.reject(new Error(SAVE_DUPLICATE_REJECTED));
  }
}
